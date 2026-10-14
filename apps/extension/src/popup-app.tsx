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
  analysisStage,
  analysisStageCount,
  stateCopy,
  stateFromApiStatus,
  stateFromRequestError,
  stateFromJobStatus,
  stateFromTab,
  type ExtensionState,
} from './state-model';
import './popup.css';

const pollIntervalMs = 1_500;
const workerStaleTimeoutMs = 5 * 60_000;
type GuestSession = typeof guestSessionResponseSchema._output.data;
type GuestResult = typeof guestAnalysisResultResponseSchema._output.data;
type RegisteredResult = typeof analysisDetailResponseSchema._output.data;
type AnalysisMode = 'guest' | 'registered';
type JobProgress = typeof analysisJobProgressResponseSchema._output.data;
type PollJob = (jobId: string, mode: AnalysisMode, attempt?: number) => Promise<void>;

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
  const [state, setState] = useState<ExtensionState>('detecting_page');
  const [guest, setGuest] = useState<GuestSession>();
  const [guestResult, setGuestResult] = useState<GuestResult>();
  const [registeredResult, setRegisteredResult] = useState<RegisteredResult>();
  const [usage, setUsage] = useState<typeof usageResponseSchema._output.data>();
  const [progress, setProgress] = useState(0);
  const [jobProgress, setJobProgress] = useState<JobProgress>();
  const [analysisStartedAt, setAnalysisStartedAt] = useState<string>();
  const [clock, setClock] = useState(() => Date.now());
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const pollingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const operationRef = useRef<'guest' | 'registered' | 'retry' | null>(null);
  const lastAnalysisModeRef = useRef<AnalysisMode | null>(null);
  const pollJobRef = useRef<PollJob | null>(null);
  const [activeJobId, setActiveJobId] = useState<string>();

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
    void chrome.storage.local.get('theme').then((stored) => {
      const nextTheme = stored.theme === 'dark' ? 'dark' : 'light';
      setTheme(nextTheme);
      document.documentElement.dataset.theme = nextTheme;
    });
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.all([
      chrome.tabs.query({ active: true, lastFocusedWindow: true }),
      chrome.storage.local.get([
        'accessToken',
        'guestToken',
        'guestSessionId',
        'privacyAcknowledged',
        'lastConvertedAnalysisId',
        'activeAnalysisJobId',
        'activeAnalysisMode',
        'analysisStartedAt',
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
        const storedJobId =
          typeof stored.activeAnalysisJobId === 'string' ? stored.activeAnalysisJobId : undefined;
        const resumeStoredJob = async (mode: AnalysisMode) => {
          if (!storedJobId || !pollJobRef.current) return false;
          lastAnalysisModeRef.current = mode;
          setActiveJobId(storedJobId);
          setAnalysisStartedAt(
            typeof stored.analysisStartedAt === 'string' ? stored.analysisStartedAt : undefined,
          );
          setProgress(0);
          setJobProgress(undefined);
          setState(mode === 'guest' ? 'guest_analyzing' : 'registered_analyzing');
          await pollJobRef.current(storedJobId, mode);
          return true;
        };
        if (typeof stored.accessToken === 'string') {
          if (typeof stored.guestToken === 'string' && typeof stored.guestSessionId === 'string')
            await chrome.runtime.sendMessage({ type: 'convert-guest' }).catch(() => undefined);
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
          if (await resumeStoredJob('registered')) return;
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
        if (!parsed.success) return setState('api_invalid_response');
        setGuest(parsed.data.data);
        await chrome.storage.local.set({ guestSessionId: parsed.data.data.sessionId });
        if (await resumeStoredJob('guest')) return;
        setState(guestEntryState(parsed.data.data, stored.privacyAcknowledged === true));
      })
      .catch((error: unknown) => setState(stateFromRequestError(error, navigator.onLine)));
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

  const pollJob = async (jobId: string, mode: AnalysisMode, attempt = 0): Promise<void> => {
    try {
      const response = await apiRequest('/analysis-jobs/' + encodeURIComponent(jobId));
      if (!response.ok) {
        setState(stateFromApiStatus(response.status, await errorCode(response)));
        return;
      }
      const parsed = analysisJobProgressResponseSchema.safeParse(await response.json());
      if (!parsed.success) {
        setState('api_invalid_response');
        return;
      }
      const job = parsed.data.data;
      setJobProgress(job);
      setProgress(job.progress);
      if (job.startedAt) setAnalysisStartedAt(job.startedAt);
      const nextState = stateFromJobStatus(job.status, mode);
      setState(nextState);
      const terminal =
        nextState === 'guest_result' ||
        nextState === 'registered_result' ||
        nextState === 'partial_result' ||
        nextState === 'analysis_failed';
      const clearActiveJob = async () => {
        await chrome.storage.local.remove([
          'activeAnalysisJobId',
          'activeAnalysisMode',
          'analysisStartedAt',
        ]);
        setActiveJobId(undefined);
      };
      if (['guest_result', 'registered_result', 'partial_result'].includes(nextState)) {
        const path =
          mode === 'guest'
            ? '/guest-analyses/' + encodeURIComponent(job.analysisId)
            : '/analyses/' + encodeURIComponent(job.analysisId);
        const detailResponse = await apiRequest(path);
        if (!detailResponse.ok) {
          setState(stateFromApiStatus(detailResponse.status, await errorCode(detailResponse)));
          return;
        }
        if (detailResponse.ok) {
          const body = await detailResponse.json();
          if (mode === 'guest') {
            const detail = guestAnalysisResultResponseSchema.safeParse(body);
            if (!detail.success) return setState('api_invalid_response');
            setGuestResult(detail.data.data);
            await clearActiveJob();
            await refreshGuest().catch(() => undefined);
          } else {
            const detail = analysisDetailResponseSchema.safeParse(body);
            if (!detail.success) return setState('api_invalid_response');
            setRegisteredResult(detail.data.data);
            await clearActiveJob();
          }
        }
        return;
      }
      if (nextState === 'analysis_failed') {
        if (terminal) await clearActiveJob();
        if (mode === 'guest') await refreshGuest().catch(() => undefined);
        return;
      }
      const activityAt = Date.parse(job.updatedAt);
      const startedAt = Date.parse(job.startedAt ?? analysisStartedAt ?? job.updatedAt);
      const stale =
        Number.isFinite(activityAt) &&
        Number.isFinite(startedAt) &&
        Date.now() - activityAt >= workerStaleTimeoutMs &&
        Date.now() - startedAt >= workerStaleTimeoutMs;
      if (stale) {
        setState('analysis_timed_out');
        return;
      }
      pollingTimer.current = setTimeout(
        () => void pollJob(jobId, mode, attempt + 1),
        pollIntervalMs,
      );
    } catch (error) {
      setState(stateFromRequestError(error, navigator.onLine));
    }
  };
  pollJobRef.current = pollJob;
  const analyzeGuest = async () => {
    if (!url || !guest || operationRef.current) return;
    if (guest.quotaReached) return setState('guest_limit_reached');
    operationRef.current = 'guest';
    lastAnalysisModeRef.current = 'guest';
    setState('guest_disclosure');
    await chrome.storage.local.set({ privacyAcknowledged: true });
    const startedAt = new Date().toISOString();
    setAnalysisStartedAt(startedAt);
    setJobProgress(undefined);
    setState('guest_analyzing');
    setProgress(0);
    try {
      const response = await apiRequest('/guest-analyses', {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ url }),
      });
      if (!response.ok)
        return setState(stateFromApiStatus(response.status, await errorCode(response)));
      const parsed = guestAnalysisAcceptedResponseSchema.safeParse(await response.json());
      if (!parsed.success) return setState('api_invalid_response');
      setGuest(parsed.data.data.entitlement);
      await chrome.storage.local.set({
        currentGuestAnalysisId: parsed.data.data.analysisId,
        activeAnalysisJobId: parsed.data.data.jobId,
        activeAnalysisMode: 'guest',
        analysisStartedAt: startedAt,
      });
      setActiveJobId(parsed.data.data.jobId);
      await pollJob(parsed.data.data.jobId, 'guest');
    } catch (error) {
      setState(stateFromRequestError(error, navigator.onLine));
    } finally {
      operationRef.current = null;
    }
  };

  const analyzeRegistered = async () => {
    if (!url || operationRef.current) return;
    operationRef.current = 'registered';
    lastAnalysisModeRef.current = 'registered';
    const startedAt = new Date().toISOString();
    setAnalysisStartedAt(startedAt);
    setJobProgress(undefined);
    setState('registered_analyzing');
    setProgress(0);
    try {
      const response = await apiRequest('/analyses', {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ url }),
      });
      if (!response.ok)
        return setState(stateFromApiStatus(response.status, await errorCode(response)));
      const parsed = analysisAcceptedResponseSchema.safeParse(await response.json());
      if (!parsed.success) return setState('api_invalid_response');
      await chrome.storage.local.set({
        activeAnalysisJobId: parsed.data.data.jobId,
        activeAnalysisMode: 'registered',
        analysisStartedAt: startedAt,
      });
      setActiveJobId(parsed.data.data.jobId);
      await pollJob(parsed.data.data.jobId, 'registered');
    } catch (error) {
      setState(stateFromRequestError(error, navigator.onLine));
    } finally {
      operationRef.current = null;
    }
  };

  const retry = async () => {
    if (operationRef.current) return;
    operationRef.current = 'retry';
    try {
      if (
        activeJobId &&
        lastAnalysisModeRef.current &&
        [
          'analysis_timed_out',
          'backend_unavailable',
          'offline',
          'api_server_error',
          'api_timeout',
          'api_invalid_response',
        ].includes(state)
      ) {
        const mode = lastAnalysisModeRef.current;
        setState(mode === 'guest' ? 'guest_analyzing' : 'registered_analyzing');
        await pollJobRef.current?.(activeJobId, mode);
        return;
      }
      if (lastAnalysisModeRef.current === 'guest' && guest) {
        if (state === 'analysis_failed') {
          operationRef.current = null;
          await analyzeGuest();
          return;
        }
        const refreshed = await refreshGuest();
        setState(guestEntryState(refreshed, true));
        return;
      }
      if (lastAnalysisModeRef.current === 'registered') {
        if (state === 'analysis_failed') {
          operationRef.current = null;
          await analyzeRegistered();
          return;
        }
        setState('registered_ready');
        return;
      }
      window.location.reload();
    } catch (error) {
      setState(stateFromRequestError(error, navigator.onLine));
    } finally {
      operationRef.current = null;
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

  useEffect(() => {
    if (!['guest_analyzing', 'registered_analyzing', 'analysis_timed_out'].includes(state)) return;
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [state]);

  const stage = jobProgress
    ? analysisStage(jobProgress.status)
    : { index: 1, label: 'Submitting analysis' };
  const elapsedStart = jobProgress?.startedAt ?? analysisStartedAt;
  const elapsedMs = elapsedStart ? Math.max(0, clock - Date.parse(elapsedStart)) : 0;
  const elapsedTotalSeconds = Math.floor(elapsedMs / 1000);
  const elapsedLabel =
    String(Math.floor(elapsedTotalSeconds / 60)).padStart(2, '0') +
    ':' +
    String(elapsedTotalSeconds % 60).padStart(2, '0');
  const longWait = Boolean(
    jobProgress?.updatedAt &&
      Number.isFinite(Date.parse(jobProgress.updatedAt)) &&
      clock - Date.parse(jobProgress.updatedAt) >= 60_000,
  );

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
        <button
          className="theme-toggle"
          type="button"
          aria-label={theme === 'dark' ? 'Use light theme' : 'Use dark theme'}
          aria-pressed={theme === 'dark'}
          onClick={() => {
            const nextTheme = theme === 'dark' ? 'light' : 'dark';
            setTheme(nextTheme);
            document.documentElement.dataset.theme = nextTheme;
            void chrome.storage.local.set({ theme: nextTheme });
          }}
        >
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>
      </header>

      <section className="value-card" aria-live="polite">
        <p className="value-kicker">
          {domain ? `Page to analyze: ${domain}` : 'Opportunity intelligence'}
        </p>
        <h1>{copy.title}</h1>
        <p className="value-detail">{copy.detail}</p>
        {state === 'detecting_page' && (
          <div className="auth-status" role="status">
            <span className="status-spinner" />
            Checking the active page...
          </div>
        )}
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
        )}{' '}
        {['guest_analyzing', 'registered_analyzing', 'analysis_timed_out'].includes(state) && (
          <div className="analysis-progress" role="status" aria-live="polite">
            <div className="analysis-progress-heading">
              <strong>
                Step {stage.index} of {analysisStageCount}
              </strong>
              <span>{progress}%</span>
            </div>
            <div className="progress" aria-label={progress + '% complete'}>
              <span style={{ width: progress + '%' }} />
            </div>
            <strong>{stage.label}</strong>
            <small>Elapsed {elapsedLabel}</small>
            {longWait && (
              <small>
                We are taking a little longer than usual. The worker is still being checked.
              </small>
            )}
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
        {[
          'offline',
          'backend_unavailable',
          'rate_limited',
          'analysis_failed',
          'analysis_timed_out',
          'api_server_error',
          'api_timeout',
          'api_invalid_response',
        ].includes(state) && (
          <button
            className="secondary-action"
            type="button"
            onClick={() => void retry()}
            disabled={operationRef.current !== null}
          >
            Try again
          </button>
        )}
        {['session_expired', 'session_revoked'].includes(state) && (
          <button
            className="primary-action"
            type="button"
            onClick={() => void beginAuthentication('account')}
          >
            Sign in again <span aria-hidden="true">→</span>
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
