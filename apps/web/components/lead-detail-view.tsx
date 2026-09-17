'use client';

import Link from 'next/link';
import { useState } from 'react';
import { actionResponseSchema, leadDetailResponseSchema } from '@prospectai/validation';
import type { LeadStatus } from '@prospectai/types';
import { Badge, Button, Score, StatePanel } from './design-system';
import {
  ConfirmationDialog,
  DropdownMenu,
  Tabs,
  ToastProvider,
  useToast,
} from './interactive-controls';
import { ResourceFeedback } from './resource-feedback';
import { useApiResource } from '../lib/use-api-resource';
import { ApiClientError, webApiRequest } from '../lib/web-api';

const statuses: LeadStatus[] = ['new', 'contacted', 'qualified', 'won', 'lost'];
const label = (status: LeadStatus) => status.charAt(0).toUpperCase() + status.slice(1);

function LeadRecord({ leadId }: { leadId: string }) {
  const { state, retry } = useApiResource(
    `/leads/${encodeURIComponent(leadId)}`,
    leadDetailResponseSchema,
  );
  return (
    <ResourceFeedback state={state} retry={retry} notFoundTitle="Lead not found">
      {({ data }) => <LeadContent data={data} refresh={retry} />}
    </ResourceFeedback>
  );
}

function LeadContent({
  data,
  refresh,
}: {
  data: typeof leadDetailResponseSchema._output.data;
  refresh: () => void;
}) {
  const [notes, setNotes] = useState(data.notes ?? '');
  const [confirmation, setConfirmation] = useState<'archive' | 'delete' | null>(null);
  const [busy, setBusy] = useState(false);
  const notify = useToast();

  async function mutate(method: 'PATCH' | 'DELETE', body?: object) {
    if (busy) return false;
    setBusy(true);
    try {
      const response = await webApiRequest(
        `/leads/${encodeURIComponent(data.id)}`,
        actionResponseSchema,
        {
          method,
          ...(body ? { body: JSON.stringify(body) } : {}),
        },
      );
      notify(response.data.message);
      refresh();
      return true;
    } catch (error) {
      notify(
        error instanceof ApiClientError ? error.message : 'The lead could not be updated.',
        'danger',
      );
      return false;
    } finally {
      setBusy(false);
    }
  }

  const overview = (
    <div className="detail-grid">
      <section className="detail-section">
        <h3>Company overview</h3>
        <dl className="data-list">
          <div>
            <dt>Company</dt>
            <dd>{data.name ?? 'Unnamed lead'}</dd>
          </div>
          <div>
            <dt>Domain</dt>
            <dd>{data.domain ?? 'Not available'}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{label(data.status)}</dd>
          </div>
        </dl>
      </section>
      <section className="detail-section">
        <h3>Latest analysis</h3>
        {data.latestAnalysis ? (
          <>
            <p className="muted">
              {data.latestAnalysis.completedAt
                ? new Date(data.latestAnalysis.completedAt).toISOString()
                : 'In progress'}
            </p>
            <div className="scores compact-scores">
              <Score kind="website" value={data.latestAnalysis.websiteScore ?? undefined} />
              <Score kind="opportunity" value={data.opportunityScore ?? undefined} />
            </div>
            <Link href={`/app/analysis/${encodeURIComponent(data.latestAnalysis.id)}`}>
              View analysis
            </Link>
          </>
        ) : (
          <p className="muted">No analysis is linked to this lead.</p>
        )}
      </section>
      <section className="detail-section span-full">
        <h3>Recommended services</h3>
        {data.recommendedServices.length ? (
          <div className="service-list">
            {data.recommendedServices.map((service) => (
              <article key={service.id}>
                <h4>{service.title}</h4>
                <p>{service.summary}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">No evidence-backed services are available.</p>
        )}
      </section>
    </div>
  );
  const contacts = (
    <div className="detail-stack">
      <section className="detail-section">
        <h3>Contacts</h3>
        {data.contacts.length ? (
          data.contacts.map((contact) => (
            <div className="contact-row" key={contact.id}>
              <div>
                <strong>{contact.name ?? 'Unnamed contact'}</strong>
                <span>{contact.title}</span>
                {contact.email && <a href={`mailto:${contact.email}`}>{contact.email}</a>}
              </div>
            </div>
          ))
        ) : (
          <p className="muted">No contacts saved.</p>
        )}
      </section>
      <section className="detail-section">
        <h3>Notes</h3>
        <textarea
          aria-label="Lead notes"
          rows={5}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
        <Button disabled={busy} onClick={() => void mutate('PATCH', { notes })}>
          {busy ? 'Saving...' : 'Save notes'}
        </Button>
      </section>
    </div>
  );
  const activity = (
    <div className="detail-stack">
      <section className="detail-section">
        <h3>Pitches</h3>
        {data.pitches.length ? (
          data.pitches.map((pitch) => (
            <article className="pitch" key={pitch.id}>
              <Badge>{pitch.format}</Badge>
              <p>{pitch.content}</p>
            </article>
          ))
        ) : (
          <StatePanel title="No pitches yet">
            Generate a pitch from a grounded opportunity in the linked analysis.
          </StatePanel>
        )}
      </section>
      <section className="detail-section">
        <h3>Activity history</h3>
        {data.activity.length ? (
          <ol className="timeline">
            {data.activity.map((item) => (
              <li key={item.id}>
                <strong>{item.label}</strong>
                <span>{new Date(item.occurredAt).toISOString()}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="muted">No activity recorded.</p>
        )}
      </section>
    </div>
  );

  return (
    <>
      <section className="detail-hero">
        <div>
          <div className="eyebrow">{data.domain ?? 'No domain'}</div>
          <h2>{data.name ?? 'Unnamed lead'}</h2>
          <Badge
            tone={data.status === 'qualified' || data.status === 'won' ? 'positive' : 'neutral'}
          >
            {label(data.status)}
          </Badge>
        </div>
        <div className="detail-actions">
          <label>
            Status
            <select
              value={data.status}
              disabled={busy}
              onChange={(event) =>
                void mutate('PATCH', { status: event.target.value as LeadStatus })
              }
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {label(status)}
                </option>
              ))}
            </select>
          </label>
          <DropdownMenu
            label="More actions"
            items={[
              { label: 'Archive lead', onSelect: () => setConfirmation('archive') },
              {
                label: 'Delete lead',
                destructive: true,
                onSelect: () => setConfirmation('delete'),
              },
            ]}
          />
        </div>
      </section>
      <Tabs
        label="Lead detail sections"
        items={[
          { id: 'overview', label: 'Overview', content: overview },
          { id: 'contacts', label: 'Contacts & notes', content: contacts },
          { id: 'activity', label: 'Pitches & activity', content: activity },
        ]}
      />
      <ConfirmationDialog
        open={confirmation !== null}
        onOpenChange={(open) => !open && setConfirmation(null)}
        title={confirmation === 'delete' ? 'Delete this lead?' : 'Archive this lead?'}
        description={
          confirmation === 'delete'
            ? 'This permanently removes the lead and associated workspace records.'
            : 'The lead will leave active lists and remain available when filtering archived leads.'
        }
        confirmLabel={confirmation === 'delete' ? 'Delete lead' : 'Archive lead'}
        onConfirm={() =>
          void mutate(
            confirmation === 'delete' ? 'DELETE' : 'PATCH',
            confirmation === 'archive' ? { status: 'archived' } : undefined,
          )
        }
      />
    </>
  );
}

export function LeadDetailView({ leadId }: { leadId: string }) {
  return (
    <ToastProvider>
      <LeadRecord leadId={leadId} />
    </ToastProvider>
  );
}
