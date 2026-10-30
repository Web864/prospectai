'use client';

import { Activity, ArrowRight, PlugZap } from 'lucide-react';
import Link from 'next/link';
import { dashboardResponseSchema } from '@prospectai/validation';
import { V3Panel } from './workspace-v3';
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
          <div className="v3-split">
            <V3Panel padded>
              <div className="v3-subhead">
                <h2>Start with a business website</h2>
                <span className="v3-state">Next action</span>
              </div>
              <p>
                Research a website, review evidence, identify a relevant opportunity, and save a
                prospect.
              </p>
              <div className="v3-research-action">
                <Link className="v3-btn" href="/app/research">
                  Start website research <ArrowRight size={17} />
                </Link>
              </div>
            </V3Panel>
            <V3Panel padded>
              <h2>Workflow</h2>
              <div className="v3-stack v3-workflow">
                {[
                  ['01', 'Research', '/app/research'],
                  ['02', 'Review opportunities', '/app/opportunities'],
                  ['03', 'Save leads', '/app/leads'],
                  ['04', 'Create pitches', '/app/pitches'],
                ].map(([step, label, href]) => (
                  <Link className="v3-setting" key={step} href={href!}>
                    {step} · {label}
                  </Link>
                ))}
              </div>
            </V3Panel>
          </div>
          <section className="v3-split">
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
                : 'Research here, or connect the extension to associate browser research with your workspace.'}
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
