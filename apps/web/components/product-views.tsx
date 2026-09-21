'use client';

import { Activity, PlugZap } from 'lucide-react';
import Link from 'next/link';
import { dashboardResponseSchema } from '@prospectai/validation';
import { Badge, StatePanel } from './design-system';
import DashboardStats from './dashboard/DashboardStats';
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
        <div className="dashboard-view">
          <DashboardStats
            analyses={data.analyses}
            leads={data.leads}
            qualifiedOpportunities={data.qualifiedOpportunities}
            analysesUsed={data.analysesUsed}
            analysesLimit={data.analysesLimit}
            contactedProspects={data.contactedProspects}
            replies={data.replies}
            meetings={data.meetings}
            wonClients={data.wonClients}
          />
          <section className="split dashboard-panels">
            <StatePanel
              title={data.extensionConnected ? 'Extension connected' : 'Connect Chrome Extension'}
              tone={data.extensionConnected ? 'success' : 'default'}
              icon={<PlugZap size={22} />}
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
              <StatePanel title="No recent activity" icon={<Activity size={22} />}>
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
        </div>
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
