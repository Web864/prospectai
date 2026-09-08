import Link from 'next/link';
import { Badge, Button, Metric, Score, StatePanel } from './design-system';

export function DashboardView() {
  return (
    <>
      <section className="metrics">
        <Metric label="Analyses" note="This billing period" />
        <Metric label="Total leads" note="Save an analysis to begin" />
        <Metric label="Qualified opportunities" note="Based on your services" />
        <Metric label="Usage" note="Server-authoritative in Phase 5" />
      </section>
      <section className="split">
        <StatePanel
          title="Ready for your first prospect"
          action={
            <Link className="button" href="/extension/connect">
              Connect Chrome Extension
            </Link>
          }
        >
          Open a public business website, then analyze it from the ProspectAI extension.
        </StatePanel>
        <StatePanel title="Recent activity">
          Your latest analyses and saved leads will appear here.
        </StatePanel>
      </section>
    </>
  );
}

export function LeadsView() {
  return (
    <>
      <section className="toolbar">
        <label>
          Search leads
          <input placeholder="Company or domain" />
        </label>
        <select aria-label="Filter leads">
          <option>All statuses</option>
          <option>Qualified</option>
          <option>Contacted</option>
        </select>
        <Button>Filters</Button>
      </section>
      <StatePanel
        title="No saved leads yet"
        action={
          <Link className="button" href="/app">
            Analyze a website
          </Link>
        }
      >
        When you save a qualified opportunity, its company, evidence, recommended service, and pitch
        history will appear here.
      </StatePanel>
    </>
  );
}

export function AnalysisView({
  partial = false,
  failed = false,
}: {
  partial?: boolean;
  failed?: boolean;
}) {
  if (failed)
    return (
      <StatePanel title="Analysis could not be completed" action={<Button>Try again</Button>}>
        The website could not be analyzed. Check the URL or try again later.
      </StatePanel>
    );
  return (
    <>
      <section className="analysis-hero">
        <div>
          <Badge tone={partial ? 'warning' : 'positive'}>
            {partial ? 'Partial analysis' : 'Analysis ready'}
          </Badge>
          <h2>Website intelligence</h2>
          <p>Evidence, interpretation, and sellable opportunity stay distinct.</p>
        </div>
        <div className="scores">
          <Score kind="website" value={partial ? 68 : 72} />
          <Score kind="opportunity" value={partial ? 74 : 81} />
        </div>
      </section>
      <section className="recommendation">
        <Badge tone="positive">High opportunity</Badge>
        <h2>Performance optimization</h2>
        <dl>
          <div>
            <dt>Evidence</dt>
            <dd>Measured page experience and technical findings appear here.</dd>
          </div>
          <div>
            <dt>Interpretation</dt>
            <dd>These signals may affect visitor confidence and conversion.</dd>
          </div>
          <div>
            <dt>Opportunity</dt>
            <dd>Offer a focused performance improvement service backed by the findings.</dd>
          </div>
        </dl>
        <div className="actions">
          <Button>Generate pitch</Button>
          <Button>Save lead</Button>
          <Link href="/app/leads">View lead</Link>
        </div>
      </section>
    </>
  );
}
