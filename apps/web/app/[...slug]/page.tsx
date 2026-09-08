import Link from 'next/link';
import { AppShell } from '../../components/app-shell';
import { AnalysisView, DashboardView, LeadsView } from '../../components/product-views';
import { Badge, Button, Metric, StatePanel } from '../../components/design-system';
import { FormPage, SiteShell, TextField } from '../../components/site-shell';

const featureCopy = [
  {
    title: 'Evidence first',
    copy: 'See the specific signals ProspectAI detected before considering a recommendation.',
  },
  {
    title: 'Commercial interpretation',
    copy: 'Understand why a website issue may matter to the prospect’s business.',
  },
  {
    title: 'Services worth selling',
    copy: 'Prioritize grounded opportunities that fit the services you actually offer.',
  },
];
const appTitles: Record<string, string> = {
  app: 'Dashboard',
  'app/leads': 'Leads',
  'app/usage': 'Usage',
  'app/billing': 'Billing',
  'app/settings': 'Settings',
  'app/settings/extension': 'Extension management',
  'app/reports': 'Reports',
};

function Marketing({ page }: { page: string }) {
  const title =
    page === 'features'
      ? 'From website signals to credible sales opportunities'
      : page === 'how-it-works'
        ? 'A focused path from prospect to pitch'
        : page === 'pricing'
          ? 'Start free, scale when prospecting works'
          : page === 'faq'
            ? 'Questions, answered plainly'
            : 'Talk to the ProspectAI team';
  return (
    <SiteShell>
      <main className="page">
        <div className="section-title">
          <Badge>ProspectAI</Badge>
          <h1>{title}</h1>
          <p className="muted">
            Built for freelancers, agencies, consultants, and small sales teams.
          </p>
        </div>
        {page === 'pricing' ? (
          <section className="plan-grid">
            {['Free', 'Pro / Individual', 'Agency'].map((plan, index) => (
              <article className="plan" key={plan}>
                <h2>{plan}</h2>
                <p>
                  {index === 0
                    ? 'Explore the core workflow.'
                    : index === 1
                      ? 'Consistent prospecting for one professional.'
                      : 'Shared capacity for a growing team.'}
                </p>
                <Button>{index === 0 ? 'Start free' : 'Choose plan'}</Button>
              </article>
            ))}
          </section>
        ) : page === 'contact' ? (
          <section className="form-panel">
            <TextField label="Work email" type="email" />
            <label className="field">
              How can we help?
              <textarea rows={5} />
            </label>
            <Button>Send message</Button>
          </section>
        ) : (
          <section className="feature-grid">
            {featureCopy.map((item) => (
              <article className="feature" key={item.title}>
                <h2>{item.title}</h2>
                <p>{item.copy}</p>
              </article>
            ))}
          </section>
        )}
      </main>
    </SiteShell>
  );
}

function Auth({ page }: { page: string }) {
  const title =
    page === 'signup'
      ? 'Create your account'
      : page === 'login'
        ? 'Welcome back'
        : page === 'forgot-password'
          ? 'Reset your password'
          : page === 'reset-password'
            ? 'Choose a new password'
            : 'Verify your email';
  return (
    <FormPage title={title} description="Secure access to your ProspectAI workspace.">
      {page === 'verify-email' ? (
        <StatePanel title="Check your inbox">
          Use the secure verification link we sent to continue.
        </StatePanel>
      ) : (
        <form className="form-panel">
          <TextField label="Email" type="email" placeholder="you@company.com" />
          {!page.includes('forgot') && (
            <TextField
              label={page === 'reset-password' ? 'New password' : 'Password'}
              type="password"
            />
          )}
          <Button type="submit">Continue</Button>
        </form>
      )}
    </FormPage>
  );
}

function Application({ path }: { path: string }) {
  const title =
    appTitles[path] ??
    (path.startsWith('app/analysis/')
      ? 'Analysis detail'
      : path.startsWith('app/leads/')
        ? 'Lead detail'
        : 'Workspace');
  let content = <DashboardView />;
  if (path === 'app/leads') content = <LeadsView />;
  else if (path.startsWith('app/analysis/')) content = <AnalysisView />;
  else if (path.startsWith('app/leads/')) content = <AnalysisView />;
  else if (path === 'app/usage')
    content = (
      <>
        <section className="metrics">
          <Metric label="Plan" value="Free" note="Current entitlement" />
          <Metric label="Used analyses" note="Current billing period" />
          <Metric label="Remaining" note="Authoritative after API connection" />
        </section>
        <section className="settings-section">
          <h2>Analysis usage</h2>
          <div className="progress-track">
            <span style={{ width: '0%' }} />
          </div>
          <p className="muted">Usage will appear when your account is connected.</p>
          <Button>Compare plans</Button>
        </section>
      </>
    );
  else if (path === 'app/billing')
    content = (
      <section className="plan-grid">
        {['Free', 'Pro / Individual', 'Agency'].map((plan) => (
          <article className="plan" key={plan}>
            <h2>{plan}</h2>
            <p className="muted">Plan entitlements remain server-authoritative.</p>
            <Button>{plan === 'Free' ? 'Current plan' : 'Upgrade'}</Button>
          </article>
        ))}
      </section>
    );
  else if (path === 'app/settings/extension')
    content = (
      <section className="settings-section">
        <div className="status-row">
          <div>
            <h2>Chrome Extension</h2>
            <p className="muted">Connect ProspectAI to analyze the active business website.</p>
          </div>
          <Badge tone="warning">Disconnected</Badge>
        </div>
        <Button>Connect extension</Button>
      </section>
    );
  else if (path === 'app/settings')
    content = (
      <section className="settings-section">
        <h2>Profile and service preferences</h2>
        <TextField label="Display name" />
        <label className="field">
          Primary role
          <select>
            <option>Freelancer</option>
            <option>Agency</option>
            <option>Consultant</option>
            <option>Sales team</option>
          </select>
        </label>
        <Button>Save settings</Button>
      </section>
    );
  else if (path === 'app/reports')
    content = (
      <StatePanel title="No reports yet">
        Completed analyses will appear here as evidence-backed reports.
      </StatePanel>
    );
  return <AppShell title={title}>{content}</AppShell>;
}

export default async function RoutedPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const path = (await params).slug.join('/');
  if (path in appTitles || path.startsWith('app/analysis/') || path.startsWith('app/leads/'))
    return <Application path={path} />;
  if (['signup', 'login', 'verify-email', 'forgot-password', 'reset-password'].includes(path))
    return <Auth page={path} />;
  if (path === 'onboarding')
    return (
      <FormPage
        title="Shape your opportunities"
        description="Two quick details help ProspectAI prioritize relevant services."
      >
        <label className="field">
          Your role
          <select>
            <option>Freelancer</option>
            <option>Agency</option>
            <option>Consultant</option>
            <option>Sales team</option>
          </select>
        </label>
        <label className="field">
          Services offered
          <textarea rows={4} placeholder="Web design, performance, SEO..." />
        </label>
        <div className="actions">
          <Button>Continue</Button>
          <Link href="/app">Skip for now</Link>
        </div>
      </FormPage>
    );
  if (['privacy', 'terms'].includes(path))
    return (
      <SiteShell>
        <main className="page legal">
          <h1>{path === 'privacy' ? 'Privacy policy' : 'Terms of service'}</h1>
          <p>Last updated September 2026</p>
          <h2>Plain-language scope</h2>
          <p>
            ProspectAI processes the information required to provide website analysis, account
            security, and subscription services. Final legal text will be reviewed before public
            release.
          </p>
        </main>
      </SiteShell>
    );
  return <Marketing page={path} />;
}
