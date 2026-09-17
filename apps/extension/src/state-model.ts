import type { AnalysisJobStatus } from '@prospectai/types';

export const extensionStates = [
  'first_launch',
  'logged_out',
  'authentication_required',
  'connecting',
  'connected',
  'supported_website',
  'unsupported_website',
  'ready',
  'queued',
  'validating',
  'fetching',
  'rendering',
  'extracting',
  'rule_analysis',
  'ai_processing',
  'opportunity_scoring',
  'completed',
  'partial',
  'failed',
  'lead_saved',
  'pitch_generated',
  'usage_limit_reached',
  'upgrade_required',
  'offline',
  'backend_unavailable',
  'session_expired',
  'session_revoked',
  'permission_error',
  'version_unsupported',
] as const;
export type ExtensionState = (typeof extensionStates)[number];

export const stateCopy: Record<
  ExtensionState,
  { title: string; detail: string; progress?: number }
> = {
  first_launch: {
    title: 'Welcome to ProspectAI',
    detail: 'Connect your account to analyze this website.',
  },
  logged_out: { title: 'Sign in required', detail: 'Sign in securely on ProspectAI to continue.' },
  authentication_required: {
    title: 'Connect your account',
    detail: 'Authorize this extension from your ProspectAI workspace.',
  },
  connecting: { title: 'Connecting', detail: 'Finishing secure account connectionâ€¦' },
  connected: { title: 'Connected', detail: 'ProspectAI is ready on supported business websites.' },
  supported_website: {
    title: 'Website supported',
    detail: 'This public website is ready for analysis.',
  },
  unsupported_website: {
    title: 'Website not supported',
    detail: 'Open a public HTTP or HTTPS business website.',
  },
  ready: {
    title: 'Ready to analyze',
    detail: 'Inspect this website for evidence-backed opportunities.',
  },
  queued: { title: 'Preparing analysis', detail: 'Your analysis is queued.', progress: 10 },
  validating: {
    title: 'Preparing analysis',
    detail: 'Checking that this website can be analyzed.',
    progress: 20,
  },
  fetching: { title: 'Inspecting website', detail: 'Reading public website pages.', progress: 35 },
  rendering: {
    title: 'Inspecting website',
    detail: 'Rendering the website for a clearer view.',
    progress: 45,
  },
  extracting: {
    title: 'Checking website signals',
    detail: 'Organizing technical and business evidence.',
    progress: 58,
  },
  rule_analysis: {
    title: 'Checking website signals',
    detail: 'Evaluating measurable findings.',
    progress: 68,
  },
  ai_processing: {
    title: 'Understanding opportunities',
    detail: 'Connecting evidence to relevant services.',
    progress: 78,
  },
  opportunity_scoring: {
    title: 'Ranking opportunities',
    detail: 'Prioritizing commercial fit for you.',
    progress: 90,
  },
  completed: {
    title: 'Analysis ready',
    detail: 'Your strongest grounded opportunities are ready.',
    progress: 100,
  },
  partial: {
    title: 'Limited analysis ready',
    detail: 'Evidence is available, but some AI interpretation was unavailable.',
    progress: 100,
  },
  failed: { title: 'Analysis failed', detail: 'We could not finish this analysis. Try again.' },
  lead_saved: { title: 'Lead saved', detail: 'This prospect is now available in your workspace.' },
  pitch_generated: {
    title: 'Pitch generated',
    detail: 'Review and edit the pitch in the full report.',
  },
  usage_limit_reached: {
    title: 'Analysis limit reached',
    detail: 'Upgrade or wait for your next billing period.',
  },
  upgrade_required: {
    title: 'Upgrade required',
    detail: 'This action is not included in your current plan.',
  },
  offline: { title: 'You are offline', detail: 'Reconnect to the internet and try again.' },
  backend_unavailable: {
    title: 'ProspectAI is unavailable',
    detail: 'The service could not be reached. Try again shortly.',
  },
  session_expired: { title: 'Session expired', detail: 'Reconnect your account to continue.' },
  session_revoked: {
    title: 'Access revoked',
    detail: 'This extension connection was revoked in settings.',
  },
  permission_error: {
    title: 'Permission needed',
    detail: 'ProspectAI could not read the active tab.',
  },
  version_unsupported: {
    title: 'Update required',
    detail: 'Install the latest ProspectAI extension version.',
  },
};

export function stateFromTab(url?: string): ExtensionState {
  return url?.startsWith('http://') || url?.startsWith('https://')
    ? 'ready'
    : 'unsupported_website';
}
export function stateFromJobStatus(status: AnalysisJobStatus): ExtensionState {
  if (status === 'retry_pending') return 'queued';
  if (status === 'retrying') return 'validating';
  if (status === 'cancelled') return 'failed';
  return status;
}

export function stateFromApiStatus(status: number): ExtensionState {
  if (status === 401) return 'session_expired';
  if (status === 403) return 'session_revoked';
  if (status === 429) return 'usage_limit_reached';
  return 'backend_unavailable';
}
