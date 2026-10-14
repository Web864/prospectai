import type { AnalysisJobStatus } from '@prospectai/types';
import { ExtensionApiError } from './api-errors';

export const extensionStates = [
  'detecting_page',
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
  'analysis_timed_out',
  'partial_result',
  'version_unsupported',
  'session_expired',
  'session_revoked',
  'permission_error',
  'api_not_found',
  'api_server_error',
  'api_invalid_response',
  'api_timeout',
  'api_rejected',
] as const;
export type ExtensionState = (typeof extensionStates)[number];

export const stateCopy: Record<
  ExtensionState,
  { title: string; detail: string; progress?: number }
> = {
  detecting_page: {
    title: 'Checking this page',
    detail: 'Confirming that the active page is ready for analysis.',
  },
  first_use_guest: {
    title: 'Page ready to analyze',
    detail: 'ProspectAI analyzes only the public page you choose.',
  },
  guest_ready: {
    title: 'Page ready to analyze',
    detail: 'Analyze this public business page for an evidence-backed opportunity.',
  },
  guest_disclosure: {
    title: 'Start free analysis',
    detail: 'ProspectAI analyzes the page you choose to provide prospect intelligence.',
  },
  guest_analyzing: {
    title: 'Analyzing this prospect',
    detail: 'Checking public signals and identifying a credible opportunity.',
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
    title: 'Could not connect to ProspectAI',
    detail: 'The analysis service could not be reached. Check your connection and try again.',
  },
  rate_limited: {
    title: 'Please slow down',
    detail: 'Wait briefly before starting another analysis.',
  },
  analysis_failed: {
    title: 'Analysis failed',
    detail: 'We could not produce a meaningful result. This attempt is released when eligible.',
  },
  analysis_timed_out: {
    title: 'Analysis taking longer than expected',
    detail: 'The job is not reporting healthy progress. Check again before retrying.',
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
  api_not_found: {
    title: 'API endpoint not found',
    detail:
      'The configured ProspectAI API does not support this request. Check the extension configuration.',
  },
  api_server_error: {
    title: 'ProspectAI request failed',
    detail:
      'The server received the request but could not process it. Try again after the service recovers.',
  },
  api_invalid_response: {
    title: 'Unexpected API response',
    detail:
      'ProspectAI returned a response this extension could not read. Check the API and extension versions.',
  },
  api_timeout: {
    title: 'API request timed out',
    detail:
      'The request did not finish in time. Check the current job before starting another analysis.',
  },
  api_rejected: {
    title: 'Request not accepted',
    detail: 'The API rejected this request. Check the page and extension configuration.',
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

export const analysisStageCount = 6;

export function analysisStage(status: AnalysisJobStatus) {
  switch (status) {
    case 'queued':
      return { index: 1, label: 'Queued for analysis' };
    case 'validating':
      return { index: 1, label: 'Preparing analysis' };
    case 'fetching':
    case 'rendering':
      return { index: 2, label: 'Fetching website' };
    case 'extracting':
      return { index: 3, label: 'Collecting website evidence' };
    case 'rule_analysis':
      return { index: 4, label: 'Scoring website signals' };
    case 'ai_processing':
      return { index: 5, label: 'Generating insight' };
    case 'opportunity_scoring':
      return { index: 6, label: 'Preparing opportunity result' };
    case 'retry_pending':
    case 'retrying':
      return { index: 1, label: 'Retrying analysis' };
    default:
      return { index: analysisStageCount, label: 'Preparing result' };
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
  if (code === 'ANALYSIS_TIMEOUT') return 'analysis_timed_out';
  if (code === 'ANALYSIS_FAILED') return 'analysis_failed';
  if (code === 'AI_UNAVAILABLE') return 'api_server_error';
  if (code === 'GUEST_TRIAL_EXHAUSTED') return 'guest_limit_reached';
  if (code === 'AUTH_HANDOFF_EXPIRED' || code === 'AUTH_HANDOFF_INVALID') return 'auth_failed';
  if (code === 'VERSION_UNSUPPORTED') return 'version_unsupported';
  if (status === 401) return code?.startsWith('GUEST_') ? 'first_use_guest' : 'session_expired';
  if (status === 403) return 'session_revoked';
  if (status === 429) return 'rate_limited';
  if (status === 404) return 'api_not_found';
  if (status >= 500) return 'api_server_error';
  return 'api_rejected';
}

export function stateFromRequestError(error: unknown, online: boolean): ExtensionState {
  if (!online) return 'offline';
  if (error instanceof ExtensionApiError) {
    if (error.category === 'API_TIMEOUT') return 'api_timeout';
    if (error.category === 'API_INVALID_RESPONSE') return 'api_invalid_response';
    if (error.category === 'NETWORK_UNREACHABLE') return 'backend_unavailable';
  }
  return 'api_invalid_response';
}
