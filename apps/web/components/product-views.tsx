'use client';

import Link from 'next/link';
import { dashboardResponseSchema } from '@prospectai/validation';
import { Badge, Metric, StatePanel } from './design-system';
import { ResourceFeedback } from './resource-feedback';
import { useApiResource } from '../lib/use-api-resource';

export function DashboardView() {
  const { state, retry } = useApiResource('/dashboard', dashboardResponseSchema);
  return (
    <ResourceFeedback
      state={state}
      retry={retry}
      notFoundTitle="Dashboard data is not available yet"
    >
      {({ data }) => (
        <>
          <section className="metrics">
            <Metric label="Analyses" value={data.analyses} note="This billing period" />
            <Metric label="Leads" value={data.leads} note="Saved prospects" />
            <Metric
              label="Qualified opportunities"
              value={data.qualifiedOpportunities}
              note="Based on your services"
            />
            <Metric
              label="Usage"
              value={data.analysesUsed}
              note={data.analysesLimit === null ? 'No fixed limit' : `of ${data.analysesLimit}`}
            />
          </section>
          <section className="metrics secondary-metrics">
            <Metric label="Contacted" value={data.contactedProspects} note="Prospects" />
            <Metric label="Replies" value={data.replies} note="Recorded replies" />
            <Metric label="Meetings" value={data.meetings} note="Booked" />
            <Metric label="Won clients" value={data.wonClients} note="Converted" />
          </section>
          <section className="split">
            <StatePanel
              title={data.extensionConnected ? 'Extension connected' : 'Connect Chrome Extension'}
              action={
                !data.extensionConnected ? (
                  <Link className="button" href="/extension/connect">
                    Connect extension
                  </Link>
                ) : undefined
              }
            >
              {data.extensionConnected
                ? 'ProspectAI is ready to analyze supported business websites.'
                : 'Connect the extension to start evidence-backed website research.'}
            </StatePanel>
            {data.recentActivity.length === 0 ? (
              <StatePanel title="No recent activity">
                Analyses, leads, pitches, and status changes will appear here.
              </StatePanel>
            ) : (
              <section className="state-panel">
                <div className="status-row">
                  <h2>Recent activity</h2>
                  <Badge>{data.plan}</Badge>
                </div>
                <ol className="timeline">
                  {data.recentActivity.map((item) => (
                    <li key={item.id}>
                      <strong>{item.label}</strong>
                      <span>{new Date(item.occurredAt).toISOString().slice(0, 10)}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </section>
        </>
      )}
    </ResourceFeedback>
  );
}

export function LeadsView() {
  return (
    <StatePanel title="Leads are loaded from the workspace API">
      Open the Leads section to search and filter saved prospects.
    </StatePanel>
  );
}

export function AnalysisView() {
  return (
    <StatePanel title="Choose an analysis">
      Analysis evidence and opportunities load from the selected analysis record.
    </StatePanel>
  );
}
