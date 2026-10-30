'use client';

import Link from 'next/link';
import { useDeferredValue, useEffect, useState } from 'react';
import {
  Search,
  Users,
  Target,
  Send,
  CalendarDays,
  Trophy,
  Activity,
  Building2,
  MapPin,
  RotateCcw,
  type LucideIcon,
} from 'lucide-react';
import { leadListResponseSchema } from '@prospectai/validation';
import type { LeadStatus } from '@prospectai/types';
import { V3Stat } from './workspace-v3';
import { Badge } from './design-system';
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

const cards: ReadonlyArray<readonly [string, string, LucideIcon]> = [
  ['Total leads', 'On this page', Users],
  ['Qualified', 'Qualified on this page', Target],
  ['Contacted', 'Contacted on this page', Send],
  ['Meetings', 'Booked', CalendarDays],
  ['Won clients', 'Won on this page', Trophy],
];

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
      <section className="v3-stats v3-lead-stats" aria-label="Lead metrics">
        {cards.map(([title, note, Icon]) => {
          const records = state.status === 'success' ? state.data.data : null;
          const value =
            records === null || title === 'Meetings'
              ? '--'
              : title === 'Total leads'
                ? records.length
                : records.filter(
                    (lead) =>
                      lead.status ===
                      (title === 'Qualified'
                        ? 'qualified'
                        : title === 'Contacted'
                          ? 'contacted'
                          : 'won'),
                  ).length;
          return (
            <V3Stat
              key={title}
              title={title}
              value={value}
              note={title === 'Meetings' ? 'Not provided by lead API' : note}
              icon={Icon}
            />
          );
        })}
      </section>
      <section className="v3-surface">
        <div className="v3-toolrow v3-lead-filter">
          <div className="v3-lead-filter-field">
            <label htmlFor="lead-search">
              <span className="v3-field-label">Search leads</span>
            </label>
            <div className="v3-control">
              <Search className="lead-filter-control-icon" size={20} />
              <input
                id="lead-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by company name"
              />
            </div>
          </div>

          <div className="v3-lead-filter-field">
            <label htmlFor="lead-status">
              <span className="v3-field-label">
                <Activity size={17} />
                Status
              </span>
            </label>
            <div className="v3-control">
              <select
                id="lead-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as LeadStatus | 'all')}
              >
                <option value="all">All statuses</option>
                {Object.entries(statusLabels).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="v3-lead-filter-field">
            <label htmlFor="lead-industry">
              <span className="v3-field-label">
                <Building2 size={17} />
                Industry
              </span>
            </label>
            <div className="v3-control">
              <select id="lead-industry" disabled title="Industry filtering is not available yet">
                <option>Industry filter unavailable</option>
              </select>
            </div>
          </div>

          <div className="v3-lead-filter-field">
            <label htmlFor="lead-location">
              <span className="v3-field-label">
                <MapPin size={17} />
                Location
              </span>
            </label>
            <div className="v3-control">
              <select id="lead-location" disabled title="Location filtering is not available yet">
                <option>Location filter unavailable</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            className="v3-btn v3-secondary"
            onClick={() => {
              setQuery('');
              setStatus('all');
              setPage(1);
            }}
          >
            <RotateCcw size={17} />
            Clear filters
          </button>
        </div>
        <ResourceFeedback state={state} retry={retry} notFoundTitle="Lead API is not available yet">
          {({ data, meta }) =>
            data.length === 0 ? (
              <div className="v3-lead-empty">
                <div className="v3-emptyIcon">
                  <Search size={46} />
                </div>
                <h2>No saved leads match these filters</h2>
                <p>
                  Saved prospects will appear here after an evidence-backed opportunity is added as
                  a lead.
                </p>
                <div>
                  <Link className="v3-btn" href="/app/research">
                    <Search size={17} aria-hidden="true" /> Start research
                  </Link>
                </div>
              </div>
            ) : (
              <section className="v3-lead-table">
                {data.map((lead) => (
                  <div className="v3-lead-row" key={lead.id}>
                    <div>
                      <strong>{lead.name ?? lead.domain ?? 'Unnamed lead'}</strong>
                      <span>{lead.domain}</span>
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
                {meta.totalPages > 1 && (
                  <Pagination
                    page={meta.page}
                    totalPages={meta.totalPages}
                    onPageChange={setPage}
                  />
                )}
              </section>
            )
          }
        </ResourceFeedback>
      </section>
    </>
  );
}
