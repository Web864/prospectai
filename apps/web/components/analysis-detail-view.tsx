'use client';

import { AlertTriangle, Bookmark, FileSearch, Globe2, RefreshCw, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  actionResponseSchema,
  analysisAcceptedResponseSchema,
  analysisDetailResponseSchema,
  analysisJobProgressResponseSchema,
} from '@prospectai/validation';
import { Badge, Button, Score, StatePanel } from './design-system';
import { Tabs, ToastProvider, useToast } from './interactive-controls';
import { ResourceFeedback } from './resource-feedback';
import { useApiResource, type ResourceState } from '../lib/use-api-resource';
import { ApiClientError, webApiRequest } from '../lib/web-api';

const terminalStatuses = ['completed', 'partial', 'failed', 'cancelled'] as const;

function useJobProgress(jobId?: string) {
  const [state, setState] = useState<
    ResourceState<typeof analysisJobProgressResponseSchema._output>
  >(
    jobId
      ? { status: 'loading' }
      : { status: 'error', kind: 'not_found', message: 'No job selected.' },
  );
  useEffect(() => {
    if (!jobId) return;
    let stopped = false;
    let timer: number | undefined;
    let attempts = 0;
    async function poll() {
      try {
        const data = await webApiRequest(
          `/analysis-jobs/${encodeURIComponent(jobId!)}`,
          analysisJobProgressResponseSchema,
        );
        if (stopped) return;
        setState({ status: 'success', data });
        if (
          !terminalStatuses.includes(data.data.status as (typeof terminalStatuses)[number]) &&
          attempts++ < 120
        )
          timer = window.setTimeout(() => void poll(), 1500);
      } catch (error) {
        if (stopped) return;
        const failure =
          error instanceof ApiClientError
            ? error
            : new ApiClientError('request_failed', 'Job progress could not be loaded.');
        setState({ status: 'error', kind: failure.kind, message: failure.message });
      }
    }
    void poll();
    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [jobId]);
  return state;
}

function AnalysisRecord({ analysisId, jobId }: { analysisId: string; jobId?: string | undefined }) {
  const progress = useJobProgress(jobId);
  const { state, retry } = useApiResource(
    `/analyses/${encodeURIComponent(analysisId)}`,
    analysisDetailResponseSchema,
  );
  if (jobId && progress.status === 'loading')
    return <StatePanel title="Analysis queued">Loading current job progress...</StatePanel>;
  if (jobId && progress.status === 'error')
    return (
      <ResourceFeedback state={progress} retry={() => window.location.reload()}>
        {() => null}
      </ResourceFeedback>
    );
  if (
    jobId &&
    progress.status === 'success' &&
    !terminalStatuses.includes(progress.data.data.status as (typeof terminalStatuses)[number])
  ) {
    const job = progress.data.data;
    return (
      <section className="state-panel" aria-live="polite">
        <Badge>{job.status.replaceAll('_', ' ')}</Badge>
        <h2>Analysis in progress</h2>
        <p>{job.progress}% complete</p>
        <div className="progress-track">
          <span style={{ width: `${job.progress}%` }} />
        </div>
        <p className="muted">
          Attempt {job.attempt + 1} of {job.maxAttempts}
        </p>
      </section>
    );
  }
  if (
    jobId &&
    progress.status === 'success' &&
    ['failed', 'cancelled'].includes(progress.data.data.status)
  )
    return (
      <StatePanel
        title={progress.data.data.status === 'cancelled' ? 'Analysis canceled' : 'Analysis failed'}
      >
        {progress.data.data.errorMessage ?? 'No results were produced for this analysis.'}
      </StatePanel>
    );
  return (
    <ResourceFeedback
      state={state}
      retry={retry}
      notFoundTitle="Analysis results are not available yet"
    >
      {({ data }) => <AnalysisContent data={data} />}
    </ResourceFeedback>
  );
}

function PitchEditor({
  pitch,
  busy,
  onSave,
}: {
  pitch: (typeof analysisDetailResponseSchema._output.data.pitches)[number];
  busy: boolean;
  onSave: (content: string) => void;
}) {
  const [content, setContent] = useState(pitch.content);
  return (
    <article className="pitch">
      <Badge>{pitch.format}</Badge>
      <textarea
        aria-label={`${pitch.format} pitch`}
        rows={7}
        value={content}
        onChange={(event) => setContent(event.target.value)}
      />
      <Button disabled={busy} onClick={() => onSave(content)}>
        Save pitch
      </Button>
    </article>
  );
}
function AnalysisContent({ data }: { data: typeof analysisDetailResponseSchema._output.data }) {
  const notify = useToast();
  const [busy, setBusy] = useState(false);
  async function action(path: string, body?: object, method: 'POST' | 'PATCH' = 'POST') {
    if (busy) return;
    setBusy(true);
    try {
      const result = await webApiRequest(path, actionResponseSchema, {
        method,
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      notify(result.data.message);
    } catch (error) {
      notify(
        error instanceof ApiClientError ? error.message : 'The action could not be completed.',
        'danger',
      );
    } finally {
      setBusy(false);
    }
  }
  async function reanalyze() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await webApiRequest('/analyses', analysisAcceptedResponseSchema, {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ url: `https://${data.domain}`, forceRefresh: true }),
      });
      notify('Re-analysis queued');
      window.location.assign(
        `/app/analysis/${encodeURIComponent(data.id)}?job=${encodeURIComponent(result.data.jobId)}`,
      );
    } catch (error) {
      notify(
        error instanceof ApiClientError ? error.message : 'Re-analysis could not start.',
        'danger',
      );
    } finally {
      setBusy(false);
    }
  }

  const evidence = data.findings.length ? (
    <div className="finding-list">
      {data.findings.map((finding) => (
        <article className="finding" key={finding.id}>
          <div className="finding-heading">
            <span className="finding-icon" aria-hidden="true">
              <FileSearch size={17} />
            </span>
            <Badge>{finding.category}</Badge>
            <h3>{finding.title}</h3>
          </div>
          <div className="evidence-chain">
            <div>
              <strong>Evidence</strong>
              <p>{finding.evidence}</p>
            </div>
            <div>
              <strong>Interpretation</strong>
              <p>{finding.interpretation ?? 'Interpretation was not available.'}</p>
            </div>
          </div>
        </article>
      ))}
    </div>
  ) : (
    <StatePanel title="No findings available">
      The analysis completed without reliable findings.
    </StatePanel>
  );
  const opportunities = data.opportunities.length ? (
    <div className="detail-stack">
      {data.opportunities.map((opportunity) => (
        <section className="detail-section" key={opportunity.id}>
          <Badge>{Math.round(opportunity.confidence * 100)}% confidence</Badge>
          <h3 className="opportunity-title">
            <Sparkles size={17} aria-hidden="true" />
            {opportunity.title}
          </h3>
          <dl className="data-list">
            <div>
              <dt>Recommended service</dt>
              <dd>{opportunity.serviceCategory}</dd>
            </div>
            <div>
              <dt>Commercial reason</dt>
              <dd>{opportunity.commercialReason}</dd>
            </div>
            <div>
              <dt>Pitch angle</dt>
              <dd>{opportunity.pitchAngle ?? 'Not available'}</dd>
            </div>
          </dl>
          <Button
            disabled={busy}
            onClick={() =>
              void action('/pitches', { analysisId: data.id, opportunityId: opportunity.id })
            }
          >
            Generate pitch
          </Button>
        </section>
      ))}
    </div>
  ) : (
    <StatePanel title="No service opportunities identified">
      ProspectAI did not find a sufficiently grounded opportunity.
    </StatePanel>
  );
  const pitches = data.pitches.length ? (
    <div className="detail-stack">
      {data.pitches.map((pitch) => (
        <PitchEditor
          key={pitch.id}
          pitch={pitch}
          busy={busy}
          onSave={(content) => void action(`/pitches/${encodeURIComponent(pitch.id)}`, { content })}
        />
      ))}
    </div>
  ) : (
    <StatePanel title="No generated pitches">
      Generate a pitch from one of the grounded opportunities.
    </StatePanel>
  );

  return (
    <>
      <div className="actions detail-toolbar">
        <Button className="button-secondary" disabled={busy} onClick={() => void reanalyze()}>
          <RefreshCw size={16} aria-hidden="true" />
          {busy ? 'Working...' : 'Re-analyze'}
        </Button>
        <Button
          disabled={busy || data.opportunities.length === 0}
          onClick={() => void action('/leads', { analysisId: data.id })}
        >
          <Bookmark size={16} aria-hidden="true" />
          Save as lead
        </Button>
      </div>
      {data.status === 'partial' && (
        <div className="partial-banner" role="status">
          <span className="partial-icon" aria-hidden="true">
            <AlertTriangle size={20} />
          </span>
          <div>
            <strong>Partial analysis</strong>
            <p>
              <span>Some analysis stages did not complete</span>. Only evidence returned by the API
              is shown.
            </p>
          </div>
        </div>
      )}
      <section className="analysis-hero">
        <div className="analysis-company">
          <span className="analysis-site-icon" aria-hidden="true">
            <Globe2 size={26} />
          </span>
          <div>
            <Badge tone={data.status === 'completed' ? 'positive' : 'warning'}>{data.status}</Badge>
            <h2>{data.companyName ?? data.domain}</h2>
            <p>
              {data.domain}
              {data.analyzedAt ? ` | ${new Date(data.analyzedAt).toISOString()}` : ''}
            </p>
            <p>{data.businessSummary ?? 'Business summary unavailable.'}</p>
          </div>
        </div>
        <div className="scores">
          <Score kind="website" value={data.websiteScore ?? undefined} />
          <Score kind="opportunity" value={data.opportunityScore ?? undefined} />
          <div className="confidence">
            <span>Confidence</span>
            <strong>
              {data.confidence === null ? '--' : `${Math.round(data.confidence * 100)}%`}
            </strong>
            <small>
              {data.confidence !== null && data.confidence >= 0.75 ? 'High' : 'Measured'}
            </small>
            <span className="confidence-track" aria-hidden="true">
              <span style={{ width: `${Math.round((data.confidence ?? 0) * 100)}%` }} />
            </span>
          </div>
        </div>
      </section>
      <Tabs
        label="Analysis detail sections"
        items={[
          { id: 'evidence', label: 'Findings & evidence', content: evidence },
          { id: 'opportunities', label: 'Service opportunities', content: opportunities },
          { id: 'pitches', label: 'Generated pitches', content: pitches },
        ]}
      />
    </>
  );
}

export function AnalysisDetailView({
  analysisId,
  jobId,
}: {
  analysisId: string;
  jobId?: string | undefined;
}) {
  return (
    <ToastProvider>
      <AnalysisRecord analysisId={analysisId} jobId={jobId} />
    </ToastProvider>
  );
}
