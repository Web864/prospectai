import { notFound } from 'next/navigation';
import { AppShell } from '../../components/app-shell';
import { DashboardView } from '../../components/product-views';
import { Badge, Button, StatePanel } from '../../components/design-system';
import { FormPage, SiteShell, TextField } from '../../components/site-shell';
import { FaqView } from '../../components/marketing-views';
import { HowItWorksPage } from '../../components/how-it-works-page';
import { LeadListView } from '../../components/lead-list-view';
import { LeadDetailView } from '../../components/lead-detail-view';
import { AnalysisDetailView } from '../../components/analysis-detail-view';
import { FaqPage, FeaturesPage, PricingPage, ResourcesPage } from '../../components/reference-marketing-pages';
import { AuthForm } from '../../components/auth-form';
import { OnboardingForm } from '../../components/onboarding-form';
import { ExtensionConnect } from '../../components/extension-connect';
import {
  AnalysesView,
  BillingView,
  OpportunitiesView,
  PitchesView,
  ResearchView,
  SettingsView,
  UsageView,
} from '../../components/workspace-views';

const featureCopy = [
  {
    title: 'Evidence first',
    copy: 'See the specific signals ProspectAI detected before considering a recommendation.',
  },
  {
    title: 'Commercial interpretation',
    copy: "Understand why a website issue may matter to the prospect's business.",
  },
  {
    title: 'Services worth selling',
    copy: 'Prioritize grounded opportunities that fit the services you actually offer.',
  },
];
const appTitles: Record<string, string> = {
  app: 'Dashboard',
  'app/dashboard': 'Dashboard',
  'app/overview': 'Overview',
  'app/research': 'Research',
  'app/analyses': 'Analyses',
  'app/opportunities': 'Opportunities',
  'app/prospects': 'Prospects',
  'app/pitches': 'Pitches',
  'app/pitches/new': 'Generate pitch',
  'app/leads': 'Leads',
  'app/usage': 'Usage',
  'app/billing': 'Billing',
  'app/settings': 'Settings',
  'app/profile': 'Profile',
  'app/integrations': 'Integrations',
  'app/settings/extension': 'Extension management',
  'app/reports': 'Reports',
};

function Marketing({ page }: { page: string }) {
  const title =
    page === 'features'
      ? 'From website signals to credible sales opportunities'
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
        {page === 'faq' ? (
          <FaqView />
        ) : page === 'pricing' ? (
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
          <form className="form-panel" method="post">
            <TextField label="Work email" name="email" type="email" autoComplete="email" required />
            <label className="field">
              How can we help?
              <textarea rows={5} />
            </label>
            <Button type="submit">Send message</Button>
          </form>
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

function Auth({
  page,
  token,
  returnTo,
}: {
  page: string;
  token?: string | undefined;
  returnTo?: string | undefined;
}) {
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
      <AuthForm
        page={page as 'signup' | 'login' | 'verify-email' | 'forgot-password' | 'reset-password'}
        token={token}
        returnTo={returnTo}
      />
    </FormPage>
  );
}

function Application({ path, jobId }: { path: string; jobId?: string | undefined }) {
  const title =
    appTitles[path] ??
    (path.startsWith('app/analysis/')
      ? 'Analysis detail'
      : path.startsWith('app/leads/')
        ? 'Lead detail'
        : 'Workspace');
  let content = <DashboardView />;
  if (path === 'app/leads' || path === 'app/prospects') content = <LeadListView />;
  else if (path === 'app/research') content = <ResearchView />;
  else if (path === 'app/opportunities') content = <OpportunitiesView />;
  else if (path === 'app/pitches' || path === 'app/pitches/new') content = <PitchesView />;
  else if (path === 'app/analyses') content = <AnalysesView />;
  else if (path.startsWith('app/analysis/'))
    content = (
      <AnalysisDetailView
        analysisId={decodeURIComponent(path.slice('app/analysis/'.length))}
        jobId={jobId}
      />
    );
  else if (path.startsWith('app/leads/'))
    content = <LeadDetailView leadId={decodeURIComponent(path.slice('app/leads/'.length))} />;
  else if (path === 'app/usage') content = <UsageView />;
  else if (path === 'app/billing') content = <BillingView />;
  else if (path === 'app/settings/extension' || path === 'app/integrations')
    content = <SettingsView extensionOnly />;
  else if (path === 'app/settings' || path === 'app/profile') content = <SettingsView />;
  else if (path === 'app/reports')
    content = (
      <StatePanel title="No report selected">
        Open a completed analysis to view its evidence-backed report.
      </StatePanel>
    );
  return (
    <AppShell title={title} activePath={`/${path}`}>
      {content}
    </AppShell>
  );
}

export default async function RoutedPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const path = (await params).slug.join('/');
  const query = await searchParams;
  const value = (name: string) => {
    const item = query[name];
    return Array.isArray(item) ? item[0] : item;
  };
  if (path in appTitles || path.startsWith('app/analysis/') || path.startsWith('app/leads/'))
    return <Application path={path} jobId={value('job')} />;
  if (path === 'extension/connect')
    return (
      <FormPage
        title="Connect your account"
        description="Authorize ProspectAI from a signed-in workspace."
      >
        <ExtensionConnect requestId={value('request')} />
      </FormPage>
    );
  if (['signup', 'login', 'verify-email', 'forgot-password', 'reset-password'].includes(path))
    return <Auth page={path} token={value('token')} returnTo={value('returnTo')} />;
  if (path === 'onboarding')
    return (
      <FormPage
        title="Shape your opportunities"
        description="Role and services are required. Everything else can be completed later."
      >
        <OnboardingForm />
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
  if (path === 'features')
    return (
      <SiteShell activePath="/features">
        <FeaturesPage />
      </SiteShell>
    );
  if (path === 'pricing')
    return (
      <SiteShell activePath="/pricing">
        <PricingPage />
      </SiteShell>
    );
  if (path === 'faq')
    return (
      <SiteShell activePath="/faq">
        <FaqPage />
      </SiteShell>
    );
  if (path === 'how-it-works')
    return (
      <SiteShell activePath="/how-it-works">
        <HowItWorksPage />
      </SiteShell>
    );
  if (path === 'resources')
    return (
      <SiteShell activePath="/resources">
        <ResourcesPage />
      </SiteShell>
    );
  if (path === 'contact') return <Marketing page={path} />;
  notFound();
}
