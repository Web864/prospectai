'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FileText, Search, CheckCircle2, Clock3, AlertTriangle } from 'lucide-react';
import type { analysisListResponseSchema } from '@prospectai/validation';
import { Badge } from './design-system';
import { V3Stat, V3Empty } from './workspace-v3';

type Analysis = (typeof analysisListResponseSchema)['_output']['data'][number];
const columns = [
  'Website',
  'Company',
  'Status',
  'Website score',
  'Opportunity score',
  'Created at (UTC)',
  'Actions',
];
const terminal = new Set(['completed', 'partial', 'failed', 'cancelled']);
const complete = (item: Analysis) => ['completed', 'partial'].includes(item.status);

export function AnalysisCollection({ analyses }: { analyses: Analysis[] }) {
  const [tab, setTab] = useState('All analyses');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [order, setOrder] = useState('newest');
  const visible = analyses
    .filter(
      (item) =>
        item.domain.toLowerCase().includes(query.trim().toLowerCase()) &&
        (status === 'all' || item.status === status) &&
        (tab === 'All analyses' ||
          (tab === 'Completed' && complete(item)) ||
          (tab === 'In progress' && !terminal.has(item.status)) ||
          (tab === 'Failed' && item.status === 'failed')),
    )
    .sort((a, b) => (order === 'newest' ? -1 : 1) * a.createdAt.localeCompare(b.createdAt));

  return (
    <div className="workspace-analysis-collection">
      <section className="v3-stats" aria-label="Analysis metrics">
        <V3Stat
          title="Total analyses"
          icon={FileText}
          value={String(analyses.length)}
          note="Loaded records"
        />
        <V3Stat
          title="Completed"
          icon={CheckCircle2}
          value={String(analyses.filter(complete).length)}
          note="Includes partial results"
        />
        <V3Stat
          title="In progress"
          icon={Clock3}
          value={String(analyses.filter((item) => !terminal.has(item.status)).length)}
          note="Awaiting completion"
        />
        <V3Stat
          title="Failed"
          icon={AlertTriangle}
          value={String(analyses.filter((item) => item.status === 'failed').length)}
          note="Requires review"
        />
      </section>
      <section className="v3-surface">
        <div className="v3-toolrow">
          <div className="v3-tabs" role="group" aria-label="Analysis status groups">
            {['All analyses', 'Completed', 'In progress', 'Failed'].map((label) => (
              <button
                className={`v3-tab${tab === label ? ' v3-selected' : ''}`}
                type="button"
                key={label}
                aria-pressed={tab === label}
                onClick={() => setTab(label)}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="v3-search-input">
            <Search size={17} aria-hidden="true" />
            <span className="sr-only">Search websites</span>
            <input
              className="v3-field v3-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search websites"
            />
          </label>
          <label>
            <span className="sr-only">Analysis status</span>
            <select
              className="v3-field"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="all">All statuses</option>
              {[...new Set(analyses.map((item) => item.status))].sort().map((value) => (
                <option key={value} value={value}>
                  {value.replaceAll('_', ' ')}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Analysis order</span>
            <select
              className="v3-field"
              value={order}
              onChange={(event) => setOrder(event.target.value)}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>
        </div>
        {visible.length ? (
          <div className="v3-tablewrap" role="region" aria-label="Analysis results" tabIndex={0}>
            <table>
              <thead>
                <tr>
                  {columns.map((label) => (
                    <th scope="col" key={label}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.domain}</strong>
                    </td>
                    <td>
                      <span className="muted">Not provided</span>
                    </td>
                    <td>
                      <Badge
                        tone={
                          item.status === 'failed'
                            ? 'danger'
                            : item.status === 'partial'
                              ? 'warning'
                              : item.status === 'completed'
                                ? 'positive'
                                : 'neutral'
                        }
                      >
                        {item.status.replaceAll('_', ' ')}
                      </Badge>
                    </td>
                    <td>{item.websiteScore ?? '--'}</td>
                    <td>{item.opportunityScore ?? '--'}</td>
                    <td>
                      <time dateTime={item.createdAt}>
                        {item.createdAt.slice(0, 16).replace('T', ' ')}
                      </time>
                    </td>
                    <td>
                      <Link
                        href={`/app/analysis/${encodeURIComponent(item.id)}`}
                        aria-label={`View analysis for ${item.domain}`}
                      >
                        View analysis
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <>
            <div className="v3-tablewrap" role="region" aria-label="Analysis results" tabIndex={0}>
              <table>
                <thead>
                  <tr>
                    {columns.map((label) => (
                      <th scope="col" key={label}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody />
              </table>
            </div>
            <V3Empty
              icon={FileText}
              title={
                analyses.length
                  ? 'No analyses match these filters'
                  : 'Your first opportunity starts here'
              }
              action={
                analyses.length ? (
                  <button
                    className="v3-btn v3-secondary"
                    type="button"
                    onClick={() => {
                      setQuery('');
                      setStatus('all');
                      setTab('All analyses');
                    }}
                  >
                    Clear filters
                  </button>
                ) : (
                  <Link className="v3-btn" href="/app/research">
                    Research a website
                  </Link>
                )
              }
            >
              {analyses.length
                ? 'Try another website or status.'
                : 'Analyze a business website to build an evidence-backed research history.'}
            </V3Empty>
          </>
        )}
      </section>
    </div>
  );
}
