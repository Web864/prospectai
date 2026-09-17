'use client';

import Link from 'next/link';
import { useDeferredValue, useEffect, useState } from 'react';
import { leadListResponseSchema } from '@prospectai/validation';
import type { LeadStatus } from '@prospectai/types';
import { Badge, StatePanel } from './design-system';
import { Pagination } from './interactive-controls';
import { ResourceFeedback } from './resource-feedback';
import { useApiResource } from '../lib/use-api-resource';

const statusLabels: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  won: 'Won',
  lost: 'Lost',
  archived: 'Archived',
};

export function LeadListView() {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<LeadStatus | 'all'>('all');
  const deferredQuery = useDeferredValue(query);
  useEffect(() => setPage(1), [deferredQuery, status]);
  const params = new URLSearchParams({ page: String(page) });
  if (deferredQuery) params.set('search', deferredQuery);
  if (status !== 'all') params.set('status', status);
  const { state, retry } = useApiResource(`/leads?${params}`, leadListResponseSchema);

  return (
    <>
      <section className="toolbar">
        <label>
          Search leads
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Company or domain"
          />
        </label>
        <label>
          Status
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as LeadStatus | 'all')}
          >
            <option value="all">All statuses</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </section>
      <ResourceFeedback state={state} retry={retry} notFoundTitle="Lead API is not available yet">
        {({ data, meta }) =>
          data.length === 0 ? (
            <StatePanel
              title="No saved leads match these filters"
              action={
                <Link className="button" href="/app/research">
                  Start research
                </Link>
              }
            >
              Saved prospects will appear here after an evidence-backed opportunity is added as a
              lead.
            </StatePanel>
          ) : (
            <>
              <section className="lead-table" aria-label="Saved leads">
                <div className="lead-row lead-table-head">
                  <span>Company</span>
                  <span>Status</span>
                  <span>Opportunity</span>
                  <span></span>
                </div>
                {data.map((lead) => (
                  <div className="lead-row" key={lead.id}>
                    <div>
                      <strong>{lead.name ?? lead.domain ?? 'Unnamed lead'}</strong>
                      <span>{lead.domain ?? 'No domain'}</span>
                    </div>
                    <Badge
                      tone={
                        lead.status === 'qualified' || lead.status === 'won'
                          ? 'positive'
                          : 'neutral'
                      }
                    >
                      {statusLabels[lead.status]}
                    </Badge>
                    <strong>{lead.opportunityScore ?? '--'}</strong>
                    <Link href={`/app/leads/${encodeURIComponent(lead.id)}`}>View lead</Link>
                  </div>
                ))}
              </section>
              {meta.totalPages > 1 && (
                <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={setPage} />
              )}
            </>
          )
        }
      </ResourceFeedback>
    </>
  );
}
