'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import {
  actionResponseSchema,
  analysisAcceptedResponseSchema,
  analysisListResponseSchema,
  opportunityListResponseSchema,
  pitchListResponseSchema,
  settingsResponseSchema,
  subscriptionResponseSchema,
  usageResponseSchema,
} from '@prospectai/validation';
import { Badge, Button, Metric, StatePanel } from './design-system';
import { ResourceFeedback } from './resource-feedback';
import { useApiResource } from '../lib/use-api-resource';
import { ApiClientError, webApiRequest } from '../lib/web-api';

export function ResearchView() {
  const [status, setStatus] = useState<{ busy: boolean; message: string }>({
    busy: false,
    message: '',
  });
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status.busy) return;
    const url = String(new FormData(event.currentTarget).get('url') ?? '');
    setStatus({ busy: true, message: '' });
    try {
      const result = await webApiRequest('/analyses', analysisAcceptedResponseSchema, {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ url }),
      });
      window.location.assign(`/app/analysis/pending?job=${encodeURIComponent(result.data.jobId)}`);
    } catch (error) {
      setStatus({
        busy: false,
        message: error instanceof ApiClientError ? error.message : 'Analysis could not start.',
      });
    }
  }
  return (
    <form className="form-panel" onSubmit={(event) => void submit(event)}>
      <label className="field">
        Company website
        <input name="url" type="url" inputMode="url" required placeholder="https://company.com" />
      </label>
      {status.message && (
        <p className="form-message form-message-error" role="alert">
          {status.message}
        </p>
      )}
      <Button type="submit" disabled={status.busy}>
        {status.busy ? 'Starting analysis...' : 'Analyze website'}
      </Button>
    </form>
  );
}

export function AnalysesView() {
  const { state, retry } = useApiResource('/analyses', analysisListResponseSchema);
  return (
    <ResourceFeedback
      state={state}
      retry={retry}
      notFoundTitle="Analysis history API is not available yet"
    >
      {({ data }) =>
        data.length ? (
          <section className="lead-table">
            {data.map((item) => (
              <div className="lead-row" key={item.id}>
                <div>
                  <strong>{item.domain}</strong>
                  <span>{new Date(item.createdAt).toISOString()}</span>
                </div>
                <Badge>{item.status.replaceAll('_', ' ')}</Badge>
                <strong>{item.opportunityScore ?? '--'}</strong>
                <Link href={`/app/analysis/${encodeURIComponent(item.id)}`}>View</Link>
              </div>
            ))}
          </section>
        ) : (
          <StatePanel
            title="No analyses yet"
            action={
              <Link className="button" href="/app/research">
                Analyze a website
              </Link>
            }
          >
            Completed, partial, and failed analyses will appear here.
          </StatePanel>
        )
      }
    </ResourceFeedback>
  );
}

export function OpportunitiesView() {
  const { state, retry } = useApiResource('/opportunities', opportunityListResponseSchema);
  return (
    <ResourceFeedback
      state={state}
      retry={retry}
      notFoundTitle="Opportunity API is not available yet"
    >
      {({ data }) =>
        data.length ? (
          <div className="detail-stack">
            {data.map((item) => (
              <section className="detail-section" key={item.id}>
                <Badge tone="positive">{item.opportunityScore}</Badge>
                <h2>{item.title}</h2>
                <p>
                  {item.domain} | {item.serviceCategory}
                </p>
                <Link href={`/app/analysis/${encodeURIComponent(item.analysisId)}`}>
                  View evidence
                </Link>
              </section>
            ))}
          </div>
        ) : (
          <StatePanel
            title="No opportunities yet"
            action={
              <Link className="button" href="/app/research">
                Start research
              </Link>
            }
          >
            Evidence-backed service opportunities will appear after analysis.
          </StatePanel>
        )
      }
    </ResourceFeedback>
  );
}

export function PitchesView() {
  const { state, retry } = useApiResource('/pitches', pitchListResponseSchema);
  return (
    <ResourceFeedback state={state} retry={retry} notFoundTitle="Pitch API is not available yet">
      {({ data }) =>
        data.length ? (
          <div className="detail-stack">
            {data.map((pitch) => (
              <article className="pitch" key={pitch.id}>
                <Badge>{pitch.format}</Badge>
                <p>{pitch.content}</p>
                {pitch.analysisId && (
                  <Link href={`/app/analysis/${encodeURIComponent(pitch.analysisId)}`}>
                    View evidence
                  </Link>
                )}
              </article>
            ))}
          </div>
        ) : (
          <StatePanel
            title="No generated pitches"
            action={
              <Link className="button" href="/app/opportunities">
                View opportunities
              </Link>
            }
          >
            Pitches grounded in selected opportunities will appear here.
          </StatePanel>
        )
      }
    </ResourceFeedback>
  );
}

export function UsageView() {
  const { state, retry } = useApiResource('/usage', usageResponseSchema);
  return (
    <ResourceFeedback state={state} retry={retry} notFoundTitle="Usage API is not available yet">
      {({ data }) => (
        <>
          <section className="metrics">
            <Metric label="Plan" value={data.plan} note="Current entitlement" />
            <Metric label="Used analyses" value={data.used} note="Current billing period" />
            <Metric
              label="Remaining"
              value={data.remaining ?? 'No fixed limit'}
              note="Server-authoritative"
            />
          </section>
          <section className="settings-section">
            <h2>Billing period</h2>
            <p>
              {new Date(data.periodStart).toISOString()} to {new Date(data.periodEnd).toISOString()}
            </p>
            {data.quotaReached && (
              <StatePanel
                title="Analysis limit reached"
                action={
                  <Link className="button" href="/app/billing">
                    View plans
                  </Link>
                }
              >
                Upgrade or wait for the next billing period.
              </StatePanel>
            )}
          </section>
        </>
      )}
    </ResourceFeedback>
  );
}

export function BillingView() {
  const { state, retry } = useApiResource('/billing', subscriptionResponseSchema);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function billingAction(action: 'upgrade' | 'downgrade' | 'cancel') {
    if (busy) return;
    setBusy(true);
    try {
      const result = await webApiRequest('/billing/portal', actionResponseSchema, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      setMessage(result.data.message);
      if (result.data.next?.startsWith('https://')) window.location.assign(result.data.next);
    } catch (error) {
      setMessage(error instanceof ApiClientError ? error.message : 'Billing could not be updated.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <ResourceFeedback state={state} retry={retry} notFoundTitle="Billing API is not available yet">
      {({ data }) => (
        <section className="settings-section">
          <div className="status-row">
            <div>
              <h2>{data.plan} plan</h2>
              <p className="muted">
                {data.currentPeriodEnd
                  ? `Current period ends ${new Date(data.currentPeriodEnd).toISOString()}`
                  : 'No billing period end'}
              </p>
            </div>
            <Badge
              tone={
                data.status === 'active' || data.status === 'trialing'
                  ? 'positive'
                  : data.status === 'past_due'
                    ? 'danger'
                    : 'warning'
              }
            >
              {data.status.replaceAll('_', ' ')}
            </Badge>
          </div>
          {data.cancelAtPeriodEnd && (
            <p className="form-message">Cancellation is scheduled for the period end.</p>
          )}
          <div className="actions">
            <Button disabled={busy} onClick={() => void billingAction('upgrade')}>
              Upgrade
            </Button>
            <Button
              className="button-secondary"
              disabled={busy}
              onClick={() => void billingAction('downgrade')}
            >
              Downgrade
            </Button>
            <Button
              className="button-secondary"
              disabled={busy}
              onClick={() => void billingAction('cancel')}
            >
              Cancel plan
            </Button>
          </div>
          {message && <p role="status">{message}</p>}
        </section>
      )}
    </ResourceFeedback>
  );
}

export function SettingsView({ extensionOnly = false }: { extensionOnly?: boolean }) {
  const { state, retry } = useApiResource('/settings', settingsResponseSchema);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const result = await webApiRequest('/settings', actionResponseSchema, {
        method: 'PATCH',
        body: JSON.stringify({
          displayName: form.get('displayName'),
          role: form.get('role'),
          services: String(form.get('services') ?? '')
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean),
          outreachPreferences: form.get('outreachPreferences'),
        }),
      });
      setMessage(result.data.message);
      retry();
    } catch (error) {
      setMessage(error instanceof ApiClientError ? error.message : 'Settings could not be saved.');
    } finally {
      setBusy(false);
    }
  }
  async function disconnect() {
    setBusy(true);
    try {
      const result = await webApiRequest('/extension/session', actionResponseSchema, {
        method: 'DELETE',
      });
      setMessage(result.data.message);
      retry();
    } catch (error) {
      setMessage(
        error instanceof ApiClientError ? error.message : 'Extension could not be disconnected.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <ResourceFeedback state={state} retry={retry} notFoundTitle="Settings API is not available yet">
      {({ data }) =>
        extensionOnly ? (
          <section className="settings-section">
            <div className="status-row">
              <div>
                <h2>Chrome Extension</h2>
                <p className="muted">{data.extension.status}</p>
              </div>
              <Badge tone={data.extension.connected ? 'positive' : 'warning'}>
                {data.extension.connected ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>
            {data.extension.connected ? (
              <Button disabled={busy} onClick={() => void disconnect()}>
                Disconnect
              </Button>
            ) : (
              <Link className="button" href="/extension/connect">
                Reconnect
              </Link>
            )}
            {message && <p role="status">{message}</p>}
          </section>
        ) : (
          <form className="form-panel" onSubmit={(event) => void submit(event)}>
            <label className="field">
              Display name
              <input name="displayName" defaultValue={data.displayName ?? ''} />
            </label>
            <label className="field">
              Role
              <input name="role" defaultValue={data.role ?? ''} />
            </label>
            <label className="field">
              Services
              <input name="services" defaultValue={data.services.join(', ')} />
            </label>
            <label className="field">
              Outreach preferences
              <textarea
                name="outreachPreferences"
                rows={4}
                defaultValue={data.outreachPreferences ?? ''}
              />
            </label>
            {message && <p role="status">{message}</p>}
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving...' : 'Save settings'}
            </Button>
          </form>
        )
      }
    </ResourceFeedback>
  );
}
