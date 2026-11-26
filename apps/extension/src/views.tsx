import type { ReactNode } from 'react';
import type {
  analysisDetailResponseSchema,
  analysisJobProgressResponseSchema,
  guestAnalysisResultResponseSchema,
} from '@prospectai/validation';
import {
  analysisStages,
  bySeverity,
  confidenceLabel,
  elapsedLabel,
  jobHealth,
  severityLabel,
  stageIndex,
  stageLabel,
} from './state-model';

export type RegisteredResult = typeof analysisDetailResponseSchema._output.data;
export type GuestResult = typeof guestAnalysisResultResponseSchema._output.data;
export type JobProgress = typeof analysisJobProgressResponseSchema._output.data;

export function Spinner() {
  return <span className="spinner" aria-hidden="true" />;
}

export function ExternalLink({
  href,
  children,
  className = 'link-action',
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a className={className} href={href} target="_blank" rel="noopener noreferrer">
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

function scoreTone(score: number | null | undefined) {
  if (score === null || score === undefined) return 'neutral';
  if (score >= 70) return 'good';
  if (score >= 45) return 'fair';
  return 'poor';
}

/** Website score: higher is healthier. Opportunity: higher means more to sell. */
export function ScoreRow({
  websiteScore,
  opportunityScore,
  confidence,
}: {
  websiteScore?: number | null;
  opportunityScore: number | null;
  confidence?: number | null;
}) {
  return (
    <dl className="score-row">
      {websiteScore !== undefined && (
        <div className={`score score-${scoreTone(websiteScore)}`}>
          <dt>Website</dt>
          <dd>
            {websiteScore ?? '–'}
            <small>/100</small>
          </dd>
        </div>
      )}
      <div className="score score-opportunity">
        <dt>Opportunity</dt>
        <dd>
          {opportunityScore ?? '–'}
          <small>/100</small>
        </dd>
      </div>
      {confidence !== undefined && (
        <div className="score score-neutral">
          <dt>Confidence</dt>
          <dd className="score-word">{confidenceLabel(confidence)}</dd>
        </div>
      )}
    </dl>
  );
}

/** PARTIAL is a real result with evidence and scores, minus the AI layer. Never call it a failure. */
export function PartialNotice({ reason }: { reason: string | undefined }) {
  return (
    <p className="callout callout-warning">
      The website analysis completed, but AI-generated insight is unavailable for this run
      {reason ? ` (${reason.replace(/\.$/, '')})` : ''}. Scores and evidence below are real.
    </p>
  );
}

export function StatusPill({ status }: { status: string }) {
  if (status === 'completed') return <span className="pill pill-success">Complete</span>;
  if (status === 'partial') return <span className="pill pill-warning">Partial result</span>;
  return <span className="pill pill-severity-info">{status}</span>;
}

export function ProgressPanel({
  domain,
  job,
  submittedAt,
  now,
  reconnecting,
}: {
  domain: string;
  job: JobProgress | undefined;
  submittedAt: string;
  now: number;
  reconnecting: string | undefined;
}) {
  const status = job?.status ?? 'queued';
  const current = stageIndex(status);
  const elapsed = now - Date.parse(job?.startedAt ?? submittedAt);
  const health = job ? jobHealth(job, now) : 'normal';
  const percent = job?.progress ?? 0;
  return (
    <div className="progress-panel">
      <div className="progress-head">
        <strong>{job ? stageLabel(status) : 'Submitting analysis'}</strong>
        <span className="muted">
          {job ? `${percent}%` : ''} · {elapsedLabel(elapsed)}
        </span>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-label={`Analysis of ${domain}`}
        aria-valuemin={0}
        aria-valuemax={100}
        {...(job ? { 'aria-valuenow': percent } : {})}
        aria-valuetext={job ? `${percent}% – ${stageLabel(status)}` : 'Submitting'}
      >
        <span style={{ width: `${percent}%` }} />
      </div>
      <ol className="stage-list">
        {analysisStages.map((stage, index) => (
          <li
            key={stage.status}
            className={
              index < current ? 'stage-done' : index === current ? 'stage-current' : 'stage-next'
            }
            {...(index === current ? { 'aria-current': 'step' as const } : {})}
          >
            {stage.label}
          </li>
        ))}
      </ol>
      {job && job.attempt > 1 && (
        <p className="hint">
          Attempt {job.attempt} of {job.maxAttempts} after a temporary problem.
        </p>
      )}
      {health === 'retry_scheduled' && job && (
        <p className="hint">
          A temporary problem occurred. ProspectAI retries automatically
          {Date.parse(job.nextAttemptAt) > now
            ? ` in about ${Math.max(1, Math.round((Date.parse(job.nextAttemptAt) - now) / 1000))} s`
            : ' shortly'}
          .
        </p>
      )}
      {health === 'waiting_for_worker' && (
        <p className="hint">
          Your analysis is queued and will start as soon as a worker is free. It is still
          processing.
        </p>
      )}
      {health === 'slow' && (
        <p className="hint">
          This step is taking longer than usual (slow website or AI provider). Your analysis is
          still processing.
        </p>
      )}
      {reconnecting && (
        <p className="hint hint-warning" role="status">
          {reconnecting}. Reconnecting… Your analysis keeps running on ProspectAI.
        </p>
      )}
      <p className="hint">
        You can close this popup. The analysis continues, and the icon shows ✓ when it is ready.
      </p>
    </div>
  );
}

export type RegisteredActions = {
  reportUrl: string;
  save: {
    status: 'idle' | 'working' | 'saved' | 'exists' | 'failed';
    leadUrl?: string;
    message?: string;
  };
  onSave: () => void;
  pitch: { status: 'idle' | 'working' | 'ready' | 'failed'; content?: string; message?: string };
  onPitch: () => void;
  onCopyPitch: () => void;
  copied: boolean;
  pdf: 'idle' | 'working' | 'failed';
  onPdf: () => void;
};

export function RegisteredResultView({
  result,
  actions,
}: {
  result: RegisteredResult;
  actions: RegisteredActions;
}) {
  const problems = bySeverity(result.findings).slice(0, 3);
  const opportunities = result.opportunities.slice(0, 3);
  const top = opportunities[0];
  const partial = result.status === 'partial';
  return (
    <div className="result">
      <div className="result-meta">
        <StatusPill status={result.status} />
        {result.coverage && (
          <span className="muted">
            {result.coverage.analyzed} page{result.coverage.analyzed === 1 ? '' : 's'} analyzed
          </span>
        )}
      </div>
      <ScoreRow
        websiteScore={result.websiteScore}
        opportunityScore={result.opportunityScore}
        confidence={result.confidence}
      />
      {partial && <PartialNotice reason={result.limitations[0]} />}
      {result.businessSummary && (
        <section aria-labelledby="summary-heading">
          <h2 id="summary-heading">Summary</h2>
          <p className="clamp">{result.businessSummary}</p>
        </section>
      )}
      {opportunities.length > 0 && (
        <section aria-labelledby="opportunity-heading">
          <h2 id="opportunity-heading">What you can sell</h2>
          <ul className="item-list">
            {opportunities.map((opportunity) => (
              <li key={opportunity.id}>
                <div className="item-head">
                  <strong>{opportunity.serviceCategory}</strong>
                  <span className="pill pill-accent">{opportunity.opportunityScore}</span>
                </div>
                <p>{opportunity.commercialReason}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
      {problems.length > 0 && (
        <section aria-labelledby="problem-heading">
          <h2 id="problem-heading">Top problems</h2>
          <ul className="item-list">
            {problems.map((finding) => (
              <li key={finding.id}>
                <div className="item-head">
                  <strong>{finding.title}</strong>
                  <span
                    className={`pill pill-severity-${(finding.severity ?? 'info').toLowerCase()}`}
                  >
                    {severityLabel(finding.severity)}
                  </span>
                </div>
                <details>
                  <summary>Evidence</summary>
                  <p>{finding.evidence}</p>
                </details>
              </li>
            ))}
          </ul>
        </section>
      )}
      {opportunities.length === 0 && problems.length === 0 && (
        <p className="callout">
          No significant problems were detected on the analyzed pages, so there is no clear service
          opportunity yet.
        </p>
      )}
      {top?.pitchAngle && (
        <section className="next-step" aria-labelledby="next-heading">
          <h2 id="next-heading">Suggested next step</h2>
          <p>{top.pitchAngle}</p>
        </section>
      )}
      <div className="action-grid">
        <button
          type="button"
          className="button button-secondary"
          onClick={actions.onSave}
          disabled={
            actions.save.status === 'working' ||
            actions.save.status === 'saved' ||
            actions.save.status === 'exists'
          }
        >
          {actions.save.status === 'working'
            ? 'Saving…'
            : actions.save.status === 'saved' || actions.save.status === 'exists'
              ? 'Saved ✓'
              : 'Save prospect'}
        </button>
        <button
          type="button"
          className="button button-secondary"
          onClick={actions.onPitch}
          disabled={!top || actions.pitch.status === 'working'}
          title={top ? undefined : 'A pitch needs at least one opportunity'}
        >
          {actions.pitch.status === 'working' ? 'Writing pitch…' : 'Generate pitch'}
        </button>
      </div>
      <div role="status" aria-live="polite" className="action-feedback">
        {(actions.save.status === 'saved' || actions.save.status === 'exists') &&
          actions.save.leadUrl && (
            <p>
              {actions.save.status === 'saved'
                ? 'Saved to your prospects. '
                : 'Already in your prospects. '}
              <ExternalLink href={actions.save.leadUrl}>View prospect</ExternalLink>
            </p>
          )}
        {actions.save.status === 'failed' && <p className="text-danger">{actions.save.message}</p>}
        {actions.pitch.status === 'failed' && (
          <p className="text-danger">{actions.pitch.message}</p>
        )}
      </div>
      {actions.pitch.status === 'ready' && actions.pitch.content && (
        <section className="pitch" aria-labelledby="pitch-heading">
          <div className="item-head">
            <h2 id="pitch-heading">Cold email draft</h2>
            <button
              type="button"
              className="button button-ghost button-small"
              onClick={actions.onCopyPitch}
            >
              {actions.copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre className="pitch-body">{actions.pitch.content}</pre>
        </section>
      )}
      <ExternalLink href={actions.reportUrl} className="button button-primary">
        Open full report →
      </ExternalLink>
      <div className="link-row">
        <button
          type="button"
          className="link-action"
          onClick={actions.onPdf}
          disabled={actions.pdf === 'working'}
        >
          {actions.pdf === 'working' ? 'Preparing PDF…' : 'Download PDF'}
        </button>
      </div>
      {actions.pdf === 'failed' && (
        <p className="text-danger" role="alert">
          The PDF could not be created. Try again, or open the full report.
        </p>
      )}
    </div>
  );
}

export function GuestResultView({
  result,
  remaining,
  onCreateAccount,
  onPdf,
  pdf,
}: {
  result: GuestResult;
  remaining: number | undefined;
  onCreateAccount: () => void;
  onPdf: () => void;
  pdf: 'idle' | 'working' | 'failed';
}) {
  const partial = result.status === 'partial';
  return (
    <div className="result">
      <div className="result-meta">
        <StatusPill status={result.status} />
        <span className="muted">Free guest analysis</span>
      </div>
      <ScoreRow opportunityScore={result.opportunityScore} />
      {partial && <PartialNotice reason={result.limitations[0]} />}
      {result.reasoning && (
        <section aria-labelledby="guest-summary">
          <h2 id="guest-summary">Opportunity</h2>
          <p className="clamp">{result.reasoning}</p>
        </section>
      )}
      {result.keySignals.length > 0 && (
        <section aria-labelledby="guest-signals">
          <h2 id="guest-signals">Top problems</h2>
          <ul className="bullet-list">
            {result.keySignals.slice(0, 4).map((signal) => (
              <li key={signal}>{signal}</li>
            ))}
          </ul>
        </section>
      )}
      {result.recommendedNextAction && (
        <section className="next-step" aria-labelledby="guest-next">
          <h2 id="guest-next">Suggested next step</h2>
          <p>{result.recommendedNextAction}</p>
        </section>
      )}
      <div className="upsell">
        <strong>Keep this prospect</strong>
        <p>
          A free account saves this result, shows every finding with evidence and writes a tailored
          pitch.
        </p>
        <button type="button" className="button button-primary" onClick={onCreateAccount}>
          Create free account to save
        </button>
      </div>
      <div className="link-row">
        <button type="button" className="link-action" onClick={onPdf} disabled={pdf === 'working'}>
          {pdf === 'working' ? 'Preparing PDF…' : 'Download PDF'}
        </button>
        {remaining !== undefined && (
          <span className="muted">
            {remaining} free {remaining === 1 ? 'analysis' : 'analyses'} left
          </span>
        )}
      </div>
      {pdf === 'failed' && (
        <p className="text-danger" role="alert">
          The PDF could not be created. Please try again.
        </p>
      )}
    </div>
  );
}
