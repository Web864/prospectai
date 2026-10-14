export type ApiFailureCategory =
  | 'NETWORK_UNREACHABLE'
  | 'API_UNAUTHORIZED'
  | 'API_FORBIDDEN'
  | 'API_NOT_FOUND'
  | 'API_RATE_LIMITED'
  | 'API_SERVER_ERROR'
  | 'API_INVALID_RESPONSE'
  | 'API_TIMEOUT'
  | 'GUEST_QUOTA_EXHAUSTED'
  | 'ANALYSIS_FAILED'
  | 'ANALYSIS_TIMEOUT'
  | 'AI_UNAVAILABLE'
  | 'UNKNOWN_ERROR';

export class ExtensionApiError extends Error {
  constructor(readonly category: ApiFailureCategory) {
    super(category);
    this.name = 'ExtensionApiError';
  }
}

export function apiFailureCategory(status: number, code?: string): ApiFailureCategory {
  if (code === 'GUEST_TRIAL_EXHAUSTED') return 'GUEST_QUOTA_EXHAUSTED';
  if (code === 'ANALYSIS_FAILED' || code === 'ANALYSIS_TIMEOUT' || code === 'AI_UNAVAILABLE')
    return code;
  if (status === 401) return 'API_UNAUTHORIZED';
  if (status === 403) return 'API_FORBIDDEN';
  if (status === 404) return 'API_NOT_FOUND';
  if (status === 429) return 'API_RATE_LIMITED';
  if (status >= 500) return 'API_SERVER_ERROR';
  return 'UNKNOWN_ERROR';
}
