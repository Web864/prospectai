import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  actionResponseSchema,
  analysisAcceptedResponseSchema,
  analysisDetailResponseSchema,
  analysisJobProgressResponseSchema,
  extensionAuthorizationCreatedSchema,
  usageResponseSchema,
} from '@prospectai/validation';
import { apiRequest } from './api-client';
import { APP_URL } from './config';
import { createPkcePair } from './pkce';
import brandIconUrl from './icons/icon-128.png';
import {
  stateCopy,
  stateFromApiStatus,
  stateFromJobStatus,
  stateFromTab,
  type ExtensionState,
} from './state-model';
import './popup.css';

type ConnectIconName = 'arrow' | 'chart' | 'copy' | 'link' | 'shield' | 'spark';

function ConnectIcon({ name }: { name: ConnectIconName }) {
  const paths: Record<ConnectIconName, ReactNode> = {
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    chart: <path d="M5 19V9m7 10V5m7 14v-7" />,
    copy: (
      <>
        <rect x="8" y="8" width="11" height="11" rx="2" />
        <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
      </>
    ),
    link: <path d="m10 13.5 4-4m-6.5 8H6a4 4 0 0 1 0-8h3m7.5-3H18a4 4 0 0 1 0 8h-3" />,
    shield: <path d="M12 3 5 6v5c0 4.5 2.8 7.6 7 9 4.2-1.4 7-4.5 7-9V6l-7-3Zm-3 9 2 2 4-4" />,
    spark: <path d="m13 2-7 11h5l-1 9 8-12h-5V2Z" />,
  };

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      {paths[name]}
    </svg>
  );
}

const maxPollAttempts = 120;

const connectStates: ExtensionState[] = [
  'first_launch',
  'logged_out',
  'authentication_required',
  'session_expired',
  'session_revoked',
];
export function PopupApp() {
  const [url, setUrl] = useState<string>();
  const [state, setState] = useState<ExtensionState>('first_launch');
  const [copyFeedback, setCopyFeedback] = useState('Copy authorization URL');
  const [connectError, setConnectError] = useState('');
  const [result, setResult] = useState<typeof analysisDetailResponseSchema._output.data>();
  const [usage, setUsage] = useState<typeof usageResponseSchema._output.data>();
  const pollingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    Promise.all([
      chrome.tabs.query({ active: true, lastFocusedWindow: true }),
      chrome.storage.local.get(['sessionState', 'accessToken']),
    ])
      .then(([tabs, session]) => {
        const current = tabs[0]?.url;
        setUrl(current);
        setState(
          session.accessToken
            ? stateFromTab(current)
            : session.sessionState === 'disconnected'
              ? 'authentication_required'
              : 'first_launch',
        );
      })
      .catch(() => setState('permission_error'));
  }, []);
  useEffect(
    () => () => {
      if (pollingTimer.current) clearTimeout(pollingTimer.current);
    },
    [],
  );
  useEffect(() => {
    if (usage || !['ready', 'completed', 'partial'].includes(state)) return;
    void apiRequest('/usage')
      .then(async (response) => {
        if (!response.ok) return;
        const parsed = usageResponseSchema.safeParse(await response.json());
        if (parsed.success) setUsage(parsed.data.data);
      })
      .catch(() => undefined);
  }, [state, usage]);

  const pollAnalysisJob = async (jobId: string, attempt = 0): Promise<void> => {
    if (attempt >= maxPollAttempts) return setState('backend_unavailable');
    try {
      const response = await apiRequest(`/analysis-jobs/${encodeURIComponent(jobId)}`);
      if (!response.ok) return setState(stateFromApiStatus(response.status));
      const parsed = analysisJobProgressResponseSchema.safeParse(await response.json());
      if (!parsed.success) return setState('backend_unavailable');
      const nextState = stateFromJobStatus(parsed.data.data.status);
      setState(nextState);
      if (nextState === 'completed' || nextState === 'partial') {
        const detailResponse = await apiRequest(
          `/analyses/${encodeURIComponent(parsed.data.data.analysisId)}`,
        );
        if (detailResponse.ok) {
          const detail = analysisDetailResponseSchema.safeParse(await detailResponse.json());
          if (detail.success) setResult(detail.data.data);
        }
      }
      if (!['completed', 'partial', 'failed'].includes(nextState)) {
        pollingTimer.current = setTimeout(() => void pollAnalysisJob(jobId, attempt + 1), 1_500);
      }
    } catch {
      setState(navigator.onLine ? 'backend_unavailable' : 'offline');
    }
  };

  const analyze = async () => {
    if (!url) return;
    setState('queued');
    try {
      const response = await apiRequest('/analyses', {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ url }),
      });
      if (response.status === 429) return setState('usage_limit_reached');
      if (!response.ok) return setState(stateFromApiStatus(response.status));
      const parsed = analysisAcceptedResponseSchema.safeParse(await response.json());
      if (!parsed.success) return setState('backend_unavailable');
      await pollAnalysisJob(parsed.data.data.jobId);
    } catch {
      setState(navigator.onLine ? 'backend_unavailable' : 'offline');
    }
  };
  const beginConnection = async () => {
    setConnectError('');
    setState('connecting');
    try {
      const { verifier, challenge } = await createPkcePair();
      const response = await apiRequest('/extension/authorization-requests', {
        method: 'POST',
        body: JSON.stringify({
          extensionVersion: chrome.runtime.getManifest().version,
          codeChallenge: challenge,
          deviceName: navigator.platform || 'Chrome extension',
        }),
      });
      if (!response.ok) throw new Error('Authorization request failed.');
      const parsed = extensionAuthorizationCreatedSchema.safeParse(await response.json());
      if (!parsed.success) throw new Error('Authorization response was invalid.');
      await chrome.storage.local.set({
        pkceVerifier: verifier,
        authorizationRequestId: parsed.data.data.id,
      });
      await chrome.tabs.create({ url: parsed.data.data.authorizationUrl });
      setState('authentication_required');
    } catch {
      setConnectError('Secure account pairing is currently unavailable. Try again shortly.');
      setState('authentication_required');
    }
  };

  const disconnect = async () => {
    try {
      await apiRequest('/extension/session', { method: 'DELETE' });
    } finally {
      await chrome.storage.local.remove([
        'accessToken',
        'refreshToken',
        'pkceVerifier',
        'authorizationRequestId',
      ]);
      await chrome.storage.local.set({ sessionState: 'disconnected' });
      setState('authentication_required');
      setResult(undefined);
    }
  };

  const resultAction = async (kind: 'lead' | 'pitch') => {
    if (!result) return;
    const opportunity = result.opportunities[0];
    if (kind === 'pitch' && !opportunity) return setState('failed');
    try {
      const response = await apiRequest(kind === 'lead' ? '/leads' : '/pitches', {
        method: 'POST',
        body: JSON.stringify(
          kind === 'lead'
            ? { analysisId: result.id }
            : { analysisId: result.id, opportunityId: opportunity?.id },
        ),
      });
      if (!response.ok) return setState(stateFromApiStatus(response.status));
      const parsed = actionResponseSchema.safeParse(await response.json());
      if (!parsed.success) return setState('backend_unavailable');
      setState(kind === 'lead' ? 'lead_saved' : 'pitch_generated');
    } catch {
      setState(navigator.onLine ? 'backend_unavailable' : 'offline');
    }
  };
  const copy = stateCopy[state];
  const isProgress = copy.progress !== undefined && copy.progress < 100;
  const isResult = state === 'completed' || state === 'partial';
  const connectUrl = `${APP_URL}/extension/connect`;

  if (connectStates.includes(state)) {
    const copyConnectUrl = async () => {
      try {
        await navigator.clipboard.writeText(connectUrl);
        setCopyFeedback('Authorization URL copied');
      } catch {
        setCopyFeedback('Unable to copy URL');
      }
    };

    return (
      <main className="connect-page">
        <header className="connect-header">
          <div className="connect-brand">
            <img src={brandIconUrl} alt="" />
            <strong>
              Prospect<span>AI</span>
            </strong>
          </div>
          <div className="extension-ready" role="status">
            <span /> Extension ready
          </div>
        </header>

        <div className="connect-content">
          <section className="connect-card" aria-labelledby="connect-title">
            <div className="connect-badge">
              <ConnectIcon name="link" />
              Connect your workspace
            </div>
            <h1 id="connect-title">Connect your account</h1>
            <p className="connect-description">
              Authorize this extension from your ProspectAI workspace to securely access your
              account.
            </p>

            <div className="authorization-field">
              <span className="authorization-label">Authorization URL</span>
              <div className="authorization-value">
                <span className="field-icon">
                  <ConnectIcon name="link" />
                </span>
                <code title={connectUrl}>{connectUrl}</code>
                <button
                  type="button"
                  onClick={() => void copyConnectUrl()}
                  aria-label={copyFeedback}
                >
                  <ConnectIcon name="copy" />
                </button>
              </div>
            </div>

            <button
              className="connect-button"
              type="button"
              onClick={() => void beginConnection()}
              disabled={state === 'connecting'}
            >
              {state === 'connecting' ? 'Preparing secure connection...' : 'Connect account'}
              <ConnectIcon name="arrow" />
            </button>
            {connectError && (
              <p className="connect-error" role="alert">
                {connectError}
              </p>
            )}

            <p className="security-note">
              <ConnectIcon name="shield" />
              Secure and read-only access. You can revoke access at any time.
            </p>
            <span className="copy-feedback" aria-live="polite">
              {copyFeedback === 'Copy authorization URL' ? '' : copyFeedback}
            </span>
          </section>

          <section className="connect-features" aria-label="Extension benefits">
            <article>
              <span className="feature-icon feature-icon--teal">
                <ConnectIcon name="shield" />
              </span>
              <div>
                <h2>Secure access</h2>
                <p>Your data stays private and safe.</p>
              </div>
            </article>
            <article>
              <span className="feature-icon feature-icon--blue">
                <ConnectIcon name="chart" />
              </span>
              <div>
                <h2>Opportunity intelligence</h2>
                <p>Unlock insights where you work.</p>
              </div>
            </article>
            <article>
              <span className="feature-icon feature-icon--green">
                <ConnectIcon name="spark" />
              </span>
              <div>
                <h2>Fast setup</h2>
                <p>Connect in seconds.</p>
              </div>
            </article>
          </section>
        </div>

        <footer className="connect-footer">ProspectAI | Opportunity Intelligence</footer>
      </main>
    );
  }

  return (
    <main className="popup">
      <header className="popup-header">
        <h1>ProspectAI</h1>
        <span className="eyebrow">OPPORTUNITY INTELLIGENCE</span>
      </header>
      <section
        className={
          ['failed', 'backend_unavailable', 'permission_error'].includes(state) ? 'error' : ''
        }
        aria-live="polite"
      >
        <h2>{copy.title}</h2>
        <p className="detail">{copy.detail}</p>
        {url && <p className="domain">{url}</p>}
        {usage && (
          <p className="detail">
            Usage: {usage.used}
            {usage.limit === null ? '' : ` of ${usage.limit}`} analyses this period
          </p>
        )}{' '}
        {copy.progress !== undefined && (
          <div className="progress" aria-label={`${copy.progress}% complete`}>
            <span style={{ width: `${copy.progress}%` }} />
          </div>
        )}
        {isResult && result && (
          <div className="score-row">
            <div className="mini-score">
              <small>Opportunity</small>
              <strong>{result.opportunityScore ?? '--'}</strong>
              <small>Server score</small>
            </div>
            <div className="mini-score">
              <small>Website</small>
              <strong>{result.websiteScore ?? '--'}</strong>
              <small>Server score</small>
            </div>
          </div>
        )}
        {isResult && !result && (
          <p className="detail">
            The analysis finished, but detailed results are not available yet.
          </p>
        )}{' '}
        <div className="popup-actions">
          {state === 'ready' && (
            <button onClick={() => void analyze()}>Analyze current site</button>
          )}
          {isProgress && <button disabled>Analysis in progress</button>}
          {isResult && result && (
            <>
              <button
                disabled={result.opportunities.length === 0}
                onClick={() => void resultAction('pitch')}
              >
                Generate pitch
              </button>
              <button onClick={() => void resultAction('lead')}>Save lead</button>
              <a href={`${APP_URL}/app/analysis/${encodeURIComponent(result.id)}`} target="_blank">
                Open full report
              </a>
            </>
          )}
          {state === 'ready' && (
            <button className="secondary" onClick={() => void disconnect()}>
              Disconnect
            </button>
          )}
          {[
            'first_launch',
            'logged_out',
            'authentication_required',
            'session_expired',
            'session_revoked',
          ].includes(state) && (
            <a href={`${APP_URL}/extension/connect`} target="_blank">
              Connect account
            </a>
          )}
          {['failed', 'backend_unavailable', 'offline'].includes(state) && (
            <button onClick={() => void analyze()}>Try again</button>
          )}
          {['usage_limit_reached', 'upgrade_required'].includes(state) && (
            <a href={`${APP_URL}/app/billing`} target="_blank">
              View plans
            </a>
          )}
        </div>
      </section>
    </main>
  );
}
