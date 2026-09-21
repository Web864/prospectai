import { useEffect, useRef, useState } from 'react';
import {
  analysisAcceptedResponseSchema,
  analysisDetailResponseSchema,
  analysisJobProgressResponseSchema,
  extensionAuthorizationCreatedSchema,
  guestAnalysisAcceptedResponseSchema,
  guestAnalysisResultResponseSchema,
  guestSessionResponseSchema,
  usageResponseSchema,
} from '@prospectai/validation';
import { apiRequest } from './api-client';
import { APP_URL } from './config';
import { createOpaqueToken, createPkcePair } from './pkce';
import { guestEntryState, guestRemainingLabel } from './guest-flow';
import brandIconUrl from './icons/icon-128.png';
import {
  stateCopy,
  stateFromApiStatus,
  stateFromJobStatus,
  stateFromTab,
  type ExtensionState,
} from './state-model';
import './popup.css';

const maxPollAttempts = 120;
type GuestSession = typeof guestSessionResponseSchema._output.data;
type GuestResult = typeof guestAnalysisResultResponseSchema._output.data;
type RegisteredResult = typeof analysisDetailResponseSchema._output.data;

async function errorCode(response: Response) {
  try {
    const body = (await response.json()) as { error?: { code?: string } };
    return body.error?.code;
  } catch {
    return undefined;
  }
}

function hostname(url?: string) {
  try {
    return url ? new URL(url).hostname : '';
  } catch {
    return '';
  }
}

export function PopupApp() {
  const [url, setUrl] = useState<string>();
  const [state, setState] = useState<ExtensionState>('first_use_guest');
  const [guest, setGuest] = useState<GuestSession>();
  const [guestResult, setGuestResult] = useState<GuestResult>();
  const [registeredResult, setRegisteredResult] = useState<RegisteredResult>();
  const [usage, setUsage] = useState<typeof usageResponseSchema._output.data>();
  const [progress, setProgress] = useState(0);
  const pollingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshGuest = async () => {
    const response = await apiRequest('/guest-sessions');
    if (!response.ok) throw new Error('Guest session unavailable.');
    const parsed = guestSessionResponseSchema.safeParse(await response.json());
    if (!parsed.success) throw new Error('Guest session response invalid.');
    setGuest(parsed.data.data);
    await chrome.storage.local.set({ guestSessionId: parsed.data.data.sessionId });
    return parsed.data.data;
  };

  useEffect(() => {
    let active = true;
    void Promise.all([
      chrome.tabs.query({ active: true, lastFocusedWindow: true }),
      chrome.storage.local.get([
        'accessToken',
        'guestToken',
        'privacyAcknowledged',
        'lastConvertedAnalysisId',
      ]),
    ])
      .then(async ([tabs, stored]) => {
        if (!active) return;
        const currentUrl = tabs[0]?.url;
        setUrl(currentUrl);
        const pageState = stateFromTab(currentUrl);
        if (pageState === 'unsupported_page' || pageState === 'permission_error') {
          setState(pageState);
          return;
        }
        if (typeof stored.accessToken === 'string') {
          if (typeof stored.lastConvertedAnalysisId === 'string') {
            const response = await apiRequest(
              `/analyses/${encodeURIComponent(stored.lastConvertedAnalysisId)}`,
            );
            if (response.ok) {
              const parsed = analysisDetailResponseSchema.safeParse(await response.json());
              if (parsed.success) {
                setRegisteredResult(parsed.data.data);
                setState('registered_result');
                await chrome.storage.local.remove('lastConvertedAnalysisId');
                return;
              }
            }
          }
          setState('registered_ready');
          return;
        }
        if (typeof stored.guestToken !== 'string') {
          await chrome.storage.local.set({ guestToken: createOpaqueToken() });
        }
        const response = await apiRequest('/guest-sessions', { method: 'POST' });
        if (!response.ok) {
          setState(stateFromApiStatus(response.status, await errorCode(response)));
          return;
        }
        const parsed = guestSessionResponseSchema.safeParse(await response.json());
        if (!parsed.success) return setState('backend_unavailable');
        setGuest(parsed.data.data);
        await chrome.storage.local.set({ guestSessionId: parsed.data.data.sessionId });
        setState(guestEntryState(parsed.data.data, stored.privacyAcknowledged === true));
      })
      .catch(() => setState(navigator.onLine ? 'backend_unavailable' : 'offline'));
    const storageListener = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (changes.accessToken?.newValue) {
        setState('auth_success');
        setTimeout(() => setState('registered_ready'), 700);
      }
      const restoredAnalysisId = changes.lastConvertedAnalysisId?.newValue;
      if (typeof restoredAnalysisId === 'string') {
        void apiRequest(`/analyses/${encodeURIComponent(restoredAnalysisId)}`)
          .then(async (response) => {
            if (!response.ok) return;
            const parsed = analysisDetailResponseSchema.safeParse(await response.json());
            if (!parsed.success) return;
            setGuest(undefined);
            setGuestResult(undefined);
            setRegisteredResult(parsed.data.data);
            setState('registered_result');
            await chrome.storage.local.remove('lastConvertedAnalysisId');
          })
          .catch(() => undefined);
      }
    };
    chrome.storage.onChanged.addListener(storageListener);
    return () => {
      active = false;
      chrome.storage.onChanged.removeListener(storageListener);
      if (pollingTimer.current) clearTimeout(pollingTimer.current);
    };
  }, []);

  useEffect(() => {
    if (usage || !['registered_ready', 'registered_result'].includes(state)) return;
    void apiRequest('/usage')
      .then(async (response) => {
        if (!response.ok) return;
        const parsed = usageResponseSchema.safeParse(await response.json());
        if (parsed.success) setUsage(parsed.data.data);
      })
      .catch(() => undefined);
  }, [state, usage]);

  const pollJob = async (
    jobId: string,
    mode: 'guest' | 'registered',
    attempt = 0,
  ): Promise<void> => {
    if (attempt >= maxPollAttempts) return setState('backend_unavailable');
    try {
      const response = await apiRequest(`/analysis-jobs/${encodeURIComponent(jobId)}`);
      if (!response.ok)
        return setState(stateFromApiStatus(response.status, await errorCode(response)));
      const parsed = analysisJobProgressResponseSchema.safeParse(await response.json());
      if (!parsed.success) return setState('backend_unavailable');
      setProgress(parsed.data.data.progress);
      const nextState = stateFromJobStatus(parsed.data.data.status, mode);
      setState(nextState);
      if (['guest_result', 'registered_result', 'partial_result'].includes(nextState)) {
        const path =
          mode === 'guest'
            ? `/guest-analyses/${encodeURIComponent(parsed.data.data.analysisId)}`
            : `/analyses/${encodeURIComponent(parsed.data.data.analysisId)}`;
        const detailResponse = await apiRequest(path);
        if (detailResponse.ok) {
          const body = await detailResponse.json();
          if (mode === 'guest') {
            const detail = guestAnalysisResultResponseSchema.safeParse(body);
            if (detail.success) setGuestResult(detail.data.data);
            await refreshGuest();
          } else {
            const detail = analysisDetailResponseSchema.safeParse(body);
            if (detail.success) setRegisteredResult(detail.data.data);
          }
        }
        return;
      }
      if (nextState === 'analysis_failed') {
        if (mode === 'guest') await refreshGuest().catch(() => undefined);
        return;
      }
      pollingTimer.current = setTimeout(() => void pollJob(jobId, mode, attempt + 1), 1_500);
    } catch {
      setState(navigator.onLine ? 'backend_unavailable' : 'offline');
    }
  };

  const analyzeGuest = async () => {
    if (!url || !guest) return;
    if (guest.quotaReached) return setState('guest_limit_reached');
    setState('guest_disclosure');
    await chrome.storage.local.set({ privacyAcknowledged: true });
    setState('guest_analyzing');
    setProgress(5);
    try {
      const response = await apiRequest('/guest-analyses', {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ url }),
      });
      if (!response.ok)
        return setState(stateFromApiStatus(response.status, await errorCode(response)));
      const parsed = guestAnalysisAcceptedResponseSchema.safeParse(await response.json());
      if (!parsed.success) return setState('backend_unavailable');
      setGuest(parsed.data.data.entitlement);
      await chrome.storage.local.set({ currentGuestAnalysisId: parsed.data.data.analysisId });
      await pollJob(parsed.data.data.jobId, 'guest');
    } catch {
      setState(navigator.onLine ? 'backend_unavailable' : 'offline');
    }
  };

  const analyzeRegistered = async () => {
    if (!url) return;
    setState('registered_analyzing');
    setProgress(5);
    try {
      const response = await apiRequest('/analyses', {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ url }),
      });
      if (!response.ok)
        return setState(stateFromApiStatus(response.status, await errorCode(response)));
      const parsed = analysisAcceptedResponseSchema.safeParse(await response.json());
      if (!parsed.success) return setState('backend_unavailable');
      await pollJob(parsed.data.data.jobId, 'registered');
    } catch {
      setState(navigator.onLine ? 'backend_unavailable' : 'offline');
    }
  };

  const beginAuthentication = async (provider: 'google' | 'account') => {
    setState('auth_start');
    try {
      const { verifier, challenge } = await createPkcePair();
      const response = await apiRequest('/extension/authorization-requests', {
        method: 'POST',
        body: JSON.stringify({
          extensionVersion: chrome.runtime.getManifest().version,
          codeChallenge: challenge,
          deviceName: navigator.platform || 'Chrome extension',
          preferredProvider: provider,
          redirectUri: chrome.identity.getRedirectURL('prospectai'),
        }),
      });
      if (!response.ok) throw new Error('Authorization request failed.');
      const parsed = extensionAuthorizationCreatedSchema.safeParse(await response.json());
      if (!parsed.success) throw new Error('Authorization response invalid.');
      await chrome.storage.local.set({
        pkceVerifier: verifier,
        authorizationRequestId: parsed.data.data.id,
      });
      setState('auth_pending');
      const callbackUrl = await chrome.identity.launchWebAuthFlow({
        url: parsed.data.data.authorizationUrl,
        interactive: true,
      });
      if (!callbackUrl) throw new Error('Authentication was canceled.');
      const callback = new URL(callbackUrl);
      if (callback.searchParams.get('state') !== parsed.data.data.id)
        throw new Error('Authorization state did not match.');
      const code = callback.searchParams.get('code');
      if (!code) throw new Error('Authorization code was missing.');
      const result = (await chrome.runtime.sendMessage({
        type: 'complete-pairing',
        code,
      })) as { connected?: boolean };
      if (!result.connected) throw new Error('Extension pairing failed.');
      setState('auth_success');
    } catch {
      setState('auth_failed');
    }
  };

  const copy = stateCopy[state];
  const domain = hostname(url);
  const isGuestEntry = state === 'first_use_guest' || state === 'guest_ready';
  const isGuestResult = state === 'guest_result' || (state === 'partial_result' && !!guest);
  const isRegisteredResult =
    state === 'registered_result' || (state === 'partial_result' && !guest);

  return (
    <main className="value-page">
      <header className="value-header">
        <div className="value-brand">
          <img src={brandIconUrl} alt="" />
          <strong>
            Prospect<span>AI</span>
          </strong>
        </div>
        <span className="mode-pill">{guest ? 'Guest mode' : 'ProspectAI'}</span>
      </header>

      <section className="value-card" aria-live="polite">
        <p className="value-kicker">
          {domain ? `Current prospect: ${domain}` : 'Opportunity intelligence'}
        </p>
        <h1>{copy.title}</h1>
        <p className="value-detail">{copy.detail}</p>

        {guest && (
          <div className="trial-meter" role="status">
            <span>Guest mode</span>
            <strong>{guestRemainingLabel(guest)}</strong>
          </div>
        )}

        {isGuestEntry && (
          <>
            <div className="privacy-note">
              ProspectAI analyzes the page you choose to provide prospect intelligence. It does not
              monitor your browsing or analyze pages in the background.
            </div>
            <button className="primary-action" type="button" onClick={() => void analyzeGuest()}>
              {state === 'first_use_guest' ? 'Start Free Analysis' : 'Analyze This Prospect'}
              <span aria-hidden="true">→</span>
            </button>
            <button
              className="text-action"
              type="button"
              onClick={() => void beginAuthentication('account')}
            >
              Sign in
            </button>
          </>
        )}

        {['guest_analyzing', 'registered_analyzing'].includes(state) && (
          <div className="analysis-progress">
            <div className="progress" aria-label={`${progress}% complete`}>
              <span style={{ width: `${Math.max(progress, 5)}%` }} />
            </div>
            <small>Keep this popup open while ProspectAI prepares the result.</small>
          </div>
        )}

        {isGuestResult && guestResult && (
          <div className="guest-result">
            <div className="result-heading">
              <div>
                <small>Prospect</small>
                <strong>{guestResult.companyName}</strong>
              </div>
              <div className="opportunity-score">
                <small>Opportunity</small>
                <strong>{guestResult.opportunityScore ?? '--'}</strong>
              </div>
            </div>
            {guestResult.reasoning && <p>{guestResult.reasoning}</p>}
            {guestResult.keySignals.length > 0 && (
              <div>
                <h2>Key signals</h2>
                <ul>
                  {guestResult.keySignals.map((signal) => (
                    <li key={signal}>{signal}</li>
                  ))}
                </ul>
              </div>
            )}
            {guestResult.recommendedNextAction && (
              <div className="next-action">
                <small>Recommended next action</small>
                <strong>{guestResult.recommendedNextAction}</strong>
              </div>
            )}
            {guest && guest.trialRemaining > 0 ? (
              <button
                className="primary-action"
                type="button"
                onClick={() => {
                  setGuestResult(undefined);
                  setState('guest_ready');
                }}
              >
                Analyze Another Prospect <span aria-hidden="true">→</span>
              </button>
            ) : (
              <p className="limit-message">You have completed your free ProspectAI analyses.</p>
            )}
            <button
              className="secondary-action"
              type="button"
              onClick={() => void beginAuthentication('google')}
            >
              Save This Prospect - Create Free Account
            </button>
          </div>
        )}

        {state === 'guest_limit_reached' && (
          <div className="conversion-panel">
            <ul>
              <li>Save prospects and access analysis history</li>
              <li>Unlock fuller AI research and personalized pitches</li>
              <li>Sync across devices and receive monthly credits</li>
            </ul>
            <button
              className="primary-action"
              type="button"
              onClick={() => void beginAuthentication('google')}
            >
              Continue with Google <span aria-hidden="true">→</span>
            </button>
            <button
              className="text-action"
              type="button"
              onClick={() => void beginAuthentication('account')}
            >
              Sign in
            </button>
          </div>
        )}

        {state === 'registered_ready' && (
          <>
            {usage && (
              <p className="registered-usage">
                {usage.remaining ?? 'Unlimited'} analyses remaining this period
              </p>
            )}
            <button
              className="primary-action"
              type="button"
              onClick={() => void analyzeRegistered()}
            >
              Analyze This Prospect <span aria-hidden="true">→</span>
            </button>
          </>
        )}

        {isRegisteredResult && registeredResult && (
          <div className="guest-result">
            <div className="result-heading">
              <div>
                <small>Prospect</small>
                <strong>{registeredResult.companyName ?? registeredResult.domain}</strong>
              </div>
              <div className="opportunity-score">
                <small>Opportunity</small>
                <strong>{registeredResult.opportunityScore ?? '--'}</strong>
              </div>
            </div>
            <a
              className="primary-link"
              href={`${APP_URL}/app/analysis/${encodeURIComponent(registeredResult.id)}`}
              target="_blank"
            >
              Open full report →
            </a>
          </div>
        )}

        {['auth_start', 'auth_pending', 'auth_success'].includes(state) && (
          <div className="auth-status" role="status">
            <span className="status-spinner" />
            {copy.detail}
          </div>
        )}
        {state === 'auth_failed' && (
          <button
            className="primary-action"
            type="button"
            onClick={() => void beginAuthentication('google')}
          >
            Try authentication again
          </button>
        )}
        {['offline', 'backend_unavailable', 'rate_limited', 'analysis_failed'].includes(state) && (
          <button className="secondary-action" type="button" onClick={() => location.reload()}>
            Try again
          </button>
        )}
      </section>

      <footer className="value-footer">
        <span>Analysis starts only when you choose.</span>
        <span>ProspectAI | Opportunity Intelligence</span>
      </footer>
    </main>
  );
}
