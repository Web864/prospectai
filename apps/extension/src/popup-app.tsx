import { useEffect, useState } from 'react';
import { apiRequest } from './api-client';
import { stateCopy, stateFromTab, type ExtensionState } from './state-model';
import './popup.css';

export function PopupApp() {
  const [url, setUrl] = useState<string>();
  const [state, setState] = useState<ExtensionState>('first_launch');
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
  const analyze = async () => {
    if (!url) return;
    setState('queued');
    try {
      const response = await apiRequest('/analyses', {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ url }),
      });
      setState(
        response.ok
          ? 'queued'
          : response.status === 429
            ? 'usage_limit_reached'
            : 'backend_unavailable',
      );
    } catch {
      setState(navigator.onLine ? 'backend_unavailable' : 'offline');
    }
  };
  const copy = stateCopy[state];
  const isProgress = copy.progress !== undefined && copy.progress < 100;
  const isResult = state === 'completed' || state === 'partial';
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
        {copy.progress !== undefined && (
          <div className="progress" aria-label={`${copy.progress}% complete`}>
            <span style={{ width: `${copy.progress}%` }} />
          </div>
        )}
        {isResult && (
          <>
            <div className="score-row">
              <div className="mini-score">
                <small>Opportunity</small>
                <strong>81</strong>
                <small>High</small>
              </div>
              <div className="mini-score">
                <small>Website</small>
                <strong>72</strong>
                <small>Needs improvement</small>
              </div>
            </div>
            <ol className="opportunities">
              <li>Performance optimization</li>
              <li>Conversion improvements</li>
              <li>Trust and content updates</li>
            </ol>
          </>
        )}
        <div className="popup-actions">
          {state === 'ready' && (
            <button onClick={() => void analyze()}>Analyze current site</button>
          )}
          {isProgress && <button disabled>Analysis in progress</button>}
          {isResult && (
            <>
              <button>Generate pitch</button>
              <button>Save lead</button>
              <a href="https://app.prospectai.example/app/reports" target="_blank">
                Open full report
              </a>
            </>
          )}
          {[
            'first_launch',
            'logged_out',
            'authentication_required',
            'session_expired',
            'session_revoked',
          ].includes(state) && (
            <a href="https://app.prospectai.example/extension/connect" target="_blank">
              Connect account
            </a>
          )}
          {['failed', 'backend_unavailable', 'offline'].includes(state) && (
            <button onClick={() => void analyze()}>Try again</button>
          )}
          {['usage_limit_reached', 'upgrade_required'].includes(state) && (
            <a href="https://app.prospectai.example/app/billing" target="_blank">
              View plans
            </a>
          )}
        </div>
      </section>
    </main>
  );
}
