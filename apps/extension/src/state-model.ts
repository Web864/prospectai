import type { AnalysisJobStatus } from '@prospectai/types';

export const extensionStates = [
  'first_use_guest',
  'guest_ready',
  'guest_disclosure',
  'guest_analyzing',
  'guest_result',
  'guest_limit_reached',
  'auth_start',
  'auth_pending',
  'auth_success',
  'auth_failed',
  'registered_ready',
  'registered_analyzing',
  'registered_result',
  'unsupported_page',
  'offline',
  'backend_unavailable',
  'rate_limited',
  'analysis_failed',
  'partial_result',
  'version_unsupported',
  'session_expired',
  'session_revoked',
  'permission_error',
] as const;
export type ExtensionState = (typeof extensionStates)[number];

export const stateCopy: Record<
  ExtensionState,
  { title: string; detail: string; progress?: number }
> = {
  first_use_guest: {
    title: 'Current prospect detected',
    detail: 'ProspectAI analyzes only the page you choose.',
  },
  guest_ready: {
    title: 'Current prospect detected',
    detail: 'Analyze this public business page for an evidence-backed opportunity.',
  },
  guest_disclosure: {
    title: 'Start free analysis',
    detail: 'ProspectAI analyzes the page you choose to provide prospect intelligence.',
  },
  guest_analyzing: {
    title: 'Analyzing this prospect',
    detail: 'Checking public signals and identifying a credible opportunity.',
    progress: 35,
  },
  guest_result: {
    title: 'Opportunity found',
    detail: 'Here is the strongest basic opportunity supported by the available signals.',
    progress: 100,
  },
  guest_limit_reached: {
    title: 'Free analyses completed',
    detail: 'Create your free account to continue researching prospects.',
  },
  auth_start: { title: 'Continue with ProspectAI', detail: 'Preparing secure authentication.' },
  auth_pending: {
    title: 'Finish sign in',
    detail: 'Complete authentication in the ProspectAI tab. This popup will update automatically.',
  },
  auth_success: { title: 'Account connected', detail: 'Your guest results are now linked.' },
  auth_failed: { title: 'Sign in not completed', detail: 'Your guest result is safe. Try again.' },
  registered_ready: {
    title: 'Ready to analyze',
    detail: 'Inspect this website for evidence-backed opportunities.',
  },
  registered_analyzing: {
    title: 'Analyzing this prospect',
    detail: 'Your analysis is running.',
    progress: 35,
  },
  registered_result: {
    title: 'Analysis ready',
    detail: 'Your evidence-backed opportunities are ready.',
    progress: 100,
  },
  unsupported_page: {
    title: 'Page not supported',
    detail:
      'Open a public company website. Browser pages, local sites, and LinkedIn are not analyzed.',
  },
  offline: { title: 'You are offline', detail: 'Reconnect to the internet and try again.' },
  backend_unavailable: {
    title: 'ProspectAI is unavailable',
    detail: 'The service could not be reached. Try again shortly.',
  },
  rate_limited: {
    title: 'Please slow down',
    detail: 'Wait briefly before starting another analysis.',
  },
  analysis_failed: {
    title: 'Analysis failed',
    detail: 'We could not produce a meaningful result. This attempt is released when eligible.',
  },
  partial_result: {
    title: 'Limited result ready',
    detail: 'Some signals are available, but the full interpretation could not be completed.',
    progress: 100,
  },
  version_unsupported: {
    title: 'Update required',
    detail: 'Install the latest ProspectAI extension version.',
  },
  session_expired: { title: 'Session expired', detail: 'Sign in again to continue.' },
  session_revoked: { title: 'Access revoked', detail: 'This extension session was revoked.' },
  permission_error: {
    title: 'Permission needed',
    detail: 'ProspectAI could not read the active tab.',
  },
};

export function stateFromTab(url?: string): ExtensionState {
  if (!url) return 'permission_error';
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const isLinkedIn = hostname === 'linkedin.com' || hostname.endsWith('.linkedin.com');
    const isLocal =
      hostname === 'localhost' ||
      hostname === '::1' ||
      /^127\./.test(hostname) ||
      /^10\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);
    return ['http:', 'https:'].includes(parsed.protocol) && !isLinkedIn && !isLocal
      ? 'guest_ready'
      : 'unsupported_page';
  } catch {
    return 'unsupported_page';
  }
}

export function stateFromJobStatus(
  status: AnalysisJobStatus,
  mode: 'guest' | 'registered',
): ExtensionState {
  if (status === 'completed') return mode === 'guest' ? 'guest_result' : 'registered_result';
  if (status === 'partial') return 'partial_result';
  if (status === 'failed' || status === 'cancelled') return 'analysis_failed';
  return mode === 'guest' ? 'guest_analyzing' : 'registered_analyzing';
}

export function stateFromApiStatus(status: number, code?: string): ExtensionState {
  if (code === 'GUEST_TRIAL_EXHAUSTED') return 'guest_limit_reached';
  if (code === 'AUTH_HANDOFF_EXPIRED' || code === 'AUTH_HANDOFF_INVALID') return 'auth_failed';
  if (code === 'VERSION_UNSUPPORTED') return 'version_unsupported';
  if (status === 401) return code?.startsWith('GUEST_') ? 'first_use_guest' : 'session_expired';
  if (status === 403) return 'session_revoked';
  if (status === 429) return 'rate_limited';
  return 'backend_unavailable';
}
