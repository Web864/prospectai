import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AppShell } from '../../components/app-shell';
import { DashboardView } from '../../components/product-views';
import { StatePanel } from '../../components/design-system';
import { FormPage } from '../../components/site-shell';
import { LeadListView } from '../../components/lead-list-view';
import { LeadDetailView } from '../../components/lead-detail-view';
import { AnalysisDetailView } from '../../components/analysis-detail-view';
import { AuthForm } from '../../components/auth-form';
import { OnboardingForm } from '../../components/onboarding-form';
import { ExtensionConnect } from '../../components/extension-connect';
import { privateMetadata } from '../../lib/site-metadata';
import {
  AnalysesView,
  BillingView,
  OpportunitiesView,
  PitchesView,
  ResearchView,
  SettingsView,
  UsageView,
} from '../../components/workspace-views';

const appTitles: Record<string, string> = {
  app: 'Dashboard',
  'app/research': 'Research',
  'app/analyses': 'Analyses',
  'app/opportunities': 'Opportunities',
  'app/pitches': 'Pitches',
  'app/pitches/new': 'Generate pitch',
  'app/leads': 'Leads',
  'app/usage': 'Usage',
  'app/billing': 'Billing',
  'app/settings': 'Settings',
  'app/settings/extension': 'Extension management',
  'app/reports': 'Reports',
};

const authTitles: Record<string, string> = {
  signup: 'Create your account',
  login: 'Sign in',
  'verify-email': 'Verify your email',
  'forgot-password': 'Reset your password',
  'reset-password': 'Choose a new password',
  onboarding: 'Set up your workspace',
  'extension/connect': 'Connect the Chrome extension',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const path = (await params).slug.join('/');
  if (path in authTitles) return privateMetadata(authTitles[path]!);
  if (path in appTitles || path.startsWith('app/analysis/') || path.startsWith('app/leads/'))
    return privateMetadata(appTitles[path] ?? 'Workspace');
  // Rejecting unknown paths here, before the loading boundary streams, yields a real 404 status
  // instead of a soft 404 (HTTP 200 with a "not found" page).
  notFound();
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
  if (path === 'app/leads') content = <LeadListView />;
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
  else if (path === 'app/settings/extension') content = <SettingsView extensionOnly />;
  else if (path === 'app/settings') content = <SettingsView />;
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
  notFound();
}
