import type { AnalysisJobStatus } from '@prospectai/types';
import { ExtensionApiError } from './api-errors';

export type AnalysisMode = 'guest' | 'registered';

/**
 * The pipeline stages exactly as apps/worker/src/index.ts reports them (status, persisted
 * progress). `rendering` exists in the schema but the worker never emits it; it is shown as
 * fetching if a future worker does. Percentages always come from the persisted job, never from
 * this table.
 */
export const analysisStages = [
  { status: 'queued', label: 'Waiting for an analysis worker' },
  { status: 'validating', label: 'Preparing analysis' },
  { status: 'fetching', label: 'Fetching the website' },
  { status: 'extracting', label: 'Collecting evidence' },
  { status: 'rule_analysis', label: 'Scoring website signals' },
  { status: 'ai_processing', label: 'Generating AI insight' },
  { status: 'opportunity_scoring', label: 'Ranking opportunities' },
] as const satisfies ReadonlyArray<{ status: AnalysisJobStatus; label: string }>;

export const terminalStatuses: ReadonlySet<AnalysisJobStatus> = new Set([
  'completed',
  'partial',
  'failed',
  'cancelled',
]);

export function isTerminalStatus(status: AnalysisJobStatus | undefined) {
  return status !== undefined && terminalStatuses.has(status);
}

export function stageIndex(status: AnalysisJobStatus) {
  if (status === 'rendering') return 2;
  if (status === 'retry_pending' || status === 'retrying') return 0;
  const index = analysisStages.findIndex((stage) => stage.status === status);
  return index === -1 ? analysisStages.length - 1 : index;
}

export function stageLabel(status: AnalysisJobStatus) {
  if (status === 'retry_pending') return 'Retrying after a temporary problem';
  if (status === 'retrying') return 'Retrying analysis';
  return analysisStages[stageIndex(status)]!.label;
}

/** How a running job looks right now, judged from persisted timestamps. */
export type JobHealth = 'normal' | 'waiting_for_worker' | 'slow' | 'retry_scheduled';

export function jobHealth(
  job: { status: AnalysisJobStatus; updatedAt: string; nextAttemptAt: string },
  now: number,
): JobHealth {
  const sinceUpdate = now - Date.parse(job.updatedAt);
  if (job.status === 'retry_pending') return 'retry_scheduled';
  if (job.status === 'queued' && sinceUpdate >= 30_000) return 'waiting_for_worker';
  // The worker heartbeats while it holds the lease, so a long silence means a slow stage
  // (crawler or AI provider), not a failure. The job itself decides when it has failed.
  if (sinceUpdate >= 60_000) return 'slow';
  return 'normal';
}

export type NoticeAction =
  | 'retry'
  | 'resume'
  | 'sign_in'
  | 'upgrade'
  | 'create_account'
  | 'analyze_again'
  | 'none';

export type NoticeKind =
  | 'session_expired'
  | 'access_denied'
  | 'offline'
  | 'network'
  | 'service_unavailable'
  | 'request_timeout'
  | 'invalid_response'
  | 'rate_limited'
  | 'quota_exhausted'
  | 'guest_quota_exhausted'
  | 'guest_session_expired'
  | 'unsupported_website'
  | 'crawler_unreachable'
  | 'crawler_blocked'
  | 'crawler_timeout'
  | 'analysis_failed'
  | 'analysis_cancelled'
  | 'result_missing'
  | 'version_unsupported'
  | 'sign_in_failed'
  | 'sign_in_cancelled'
  | 'request_rejected';

export type Notice = {
  kind: NoticeKind;
  title: string;
  detail: string;
  action: NoticeAction;
  /** A job is still recoverable: the action must resume it, never submit a new one. */
  keepsJob?: boolean;
};

const notices: Record<NoticeKind, Omit<Notice, 'kind'>> = {
  session_expired: {
    title: 'Your session has expired',
    detail: 'Sign in again to keep analyzing. Any analysis in progress is safe on the server.',
    action: 'sign_in',
  },
  access_denied: {
    title: 'Access to this workspace was denied',
    detail:
      'Your account no longer has access to this ProspectAI workspace. Sign in again with an account that does.',
    action: 'sign_in',
  },
  offline: {
    title: 'You are offline',
    detail: 'Reconnect to the internet. Your analysis keeps running on ProspectAI meanwhile.',
    action: 'retry',
  },
  network: {
    title: 'ProspectAI could not reach the service',
    detail: 'Check your connection, VPN or firewall, then try again.',
    action: 'retry',
  },
  service_unavailable: {
    title: 'The analysis service is temporarily unavailable',
    detail: 'ProspectAI is having a problem on its side. Try again in a minute.',
    action: 'retry',
  },
  request_timeout: {
    title: 'ProspectAI is responding slowly',
    detail: 'The request did not finish in time. Trying again will not create a duplicate.',
    action: 'retry',
  },
  invalid_response: {
    title: 'Unexpected response from ProspectAI',
    detail:
      'The service answered in a way this version of the extension cannot read. Update the extension if this continues.',
    action: 'retry',
  },
  rate_limited: {
    title: 'Too many requests',
    detail: 'Wait a few seconds before trying again.',
    action: 'retry',
  },
  quota_exhausted: {
    title: 'Your analysis limit has been reached',
    detail:
      'You have used every analysis in your plan for this billing period. Upgrade to keep prospecting today.',
    action: 'upgrade',
  },
  guest_quota_exhausted: {
    title: 'Free analyses used',
    detail:
      'Create a free account to keep analyzing prospects, save them and generate pitches. Your previous results are kept.',
    action: 'create_account',
  },
  guest_session_expired: {
    title: 'Your guest session ended',
    detail: 'Start again to continue with a new guest session, or sign in.',
    action: 'retry',
  },
  unsupported_website: {
    title: 'This page cannot be analyzed',
    detail:
      'ProspectAI only analyzes public business websites. Private, local and unsupported addresses are refused.',
    action: 'none',
  },
  crawler_unreachable: {
    title: 'We could not access the website',
    detail:
      'The site did not respond, returned an error or could not be found. Check that it loads publicly, then try again.',
    action: 'analyze_again',
  },
  crawler_blocked: {
    title: 'The website blocked the analysis',
    detail:
      'This site refuses automated visits or returned content that cannot be read. No analysis was charged.',
    action: 'none',
  },
  crawler_timeout: {
    title: 'The website took too long to respond',
    detail: 'Slow sites sometimes recover. You can try again. No analysis was charged.',
    action: 'analyze_again',
  },
  analysis_failed: {
    title: 'This analysis could not be completed',
    detail: 'ProspectAI stopped after its automatic retries. No analysis was charged.',
    action: 'analyze_again',
  },
  analysis_cancelled: {
    title: 'Analysis cancelled',
    detail: 'This analysis was cancelled before it ran. No analysis was charged.',
    action: 'analyze_again',
  },
  result_missing: {
    title: 'The result is no longer available',
    detail:
      'ProspectAI could not find this analysis. It may have expired or belong to another account.',
    action: 'analyze_again',
  },
  version_unsupported: {
    title: 'Update required',
    detail: 'Update the ProspectAI extension from the Chrome Web Store to continue.',
    action: 'none',
  },
  sign_in_failed: {
    title: 'Sign in was not completed',
    detail: 'ProspectAI could not connect your account. Your guest result is safe. Try again.',
    action: 'sign_in',
  },
  sign_in_cancelled: {
    title: 'Sign in cancelled',
    detail: 'The sign-in window was closed before it finished. Your guest result is safe.',
    action: 'sign_in',
  },
  request_rejected: {
    title: 'Request not accepted',
    detail: 'ProspectAI could not accept this request. Reload the page and try again.',
    action: 'retry',
  },
};

export function notice(kind: NoticeKind, overrides: Partial<Notice> = {}): Notice {
  return { kind, ...notices[kind], ...overrides };
}

/** Maps an HTTP error response from the ProspectAI API to the matching user-facing notice. */
export function noticeFromApi(status: number, code?: string): Notice {
  switch (code) {
    case 'GUEST_TRIAL_EXHAUSTED':
      return notice('guest_quota_exhausted');
    case 'USAGE_LIMIT_REACHED':
    case 'PAYMENT_REQUIRED':
      return notice('quota_exhausted');
    case 'RATE_LIMITED':
      return notice('rate_limited');
    case 'GUEST_SESSION_EXPIRED':
    case 'GUEST_SESSION_INVALID':
      return notice('guest_session_expired');
    case 'INVALID_URL':
    case 'UNSUPPORTED_URL':
    case 'PRIVATE_NETWORK_BLOCKED':
      return notice('unsupported_website');
    case 'AUTH_HANDOFF_EXPIRED':
    case 'AUTH_HANDOFF_INVALID':
      return notice('sign_in_failed');
    case 'VERSION_UNSUPPORTED':
    case 'EXTENSION_VERSION_UNSUPPORTED':
      return notice('version_unsupported');
    case 'BACKEND_UNAVAILABLE':
    case 'EXTERNAL_SERVICE_ERROR':
      return notice('service_unavailable');
    case 'NOT_FOUND':
      return notice('result_missing');
    default:
  }
  if (status === 401) return notice('session_expired');
  if (status === 403) return notice('access_denied');
  if (status === 404) return notice('result_missing');
  if (status === 429) return notice('rate_limited');
  if (status >= 500) return notice('service_unavailable');
  return notice('request_rejected');
}

/** Maps the persisted errorCode of a FAILED/CANCELLED job to a specific, truthful notice. */
export function noticeFromJobFailure(status: AnalysisJobStatus, errorCode: string | null): Notice {
  if (status === 'cancelled') return notice('analysis_cancelled');
  switch (errorCode) {
    case 'WEBSITE_UNREACHABLE':
      return notice('crawler_unreachable');
    case 'WEBSITE_BLOCKED_CRAWLER':
      return notice('crawler_blocked');
    case 'ANALYSIS_TIMEOUT':
      return notice('crawler_timeout');
    case 'INVALID_URL':
    case 'UNSUPPORTED_URL':
    case 'PRIVATE_NETWORK_BLOCKED':
      return notice('unsupported_website');
    default:
      return notice('analysis_failed');
  }
}

/** Maps a transport-level failure (no HTTP response) to a notice. */
export function noticeFromRequestError(error: unknown, online: boolean): Notice {
  if (!online) return notice('offline');
  if (error instanceof ExtensionApiError) {
    if (error.category === 'API_TIMEOUT') return notice('request_timeout');
    if (error.category === 'API_INVALID_RESPONSE') return notice('invalid_response');
    if (error.category === 'NETWORK_UNREACHABLE') return notice('network');
  }
  return notice('invalid_response');
}

/** Transient failures are worth retrying automatically while a job is being watched. */
export function isTransient(kind: NoticeKind) {
  return [
    'offline',
    'network',
    'service_unavailable',
    'request_timeout',
    'rate_limited',
    'invalid_response',
  ].includes(kind);
}

export function confidenceLabel(confidence: number | null | undefined) {
  if (confidence === null || confidence === undefined) return 'Unknown';
  if (confidence >= 0.75) return 'High';
  if (confidence >= 0.5) return 'Medium';
  return 'Low';
}

const severityRank: Record<string, number> = {
  CRITICAL: 0,
  critical: 0,
  HIGH: 1,
  high: 1,
  MEDIUM: 2,
  medium: 2,
  LOW: 3,
  low: 3,
  INFO: 4,
  info: 4,
};

export function bySeverity<T extends { severity?: string | undefined }>(items: readonly T[]) {
  return [...items].sort(
    (a, b) => (severityRank[a.severity ?? ''] ?? 5) - (severityRank[b.severity ?? ''] ?? 5),
  );
}

/**
 * The crawler records one finding per page, so a multi-page site can return the same problem
 * several times. The popup's short lists show each problem once (the first, most severe copy).
 */
export function uniqueByTitle<T extends { title: string }>(items: readonly T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.title.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function severityLabel(severity: string | undefined) {
  if (!severity) return 'Finding';
  const lower = severity.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export function elapsedLabel(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
