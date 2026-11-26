/** Shared between the popup and the service worker without importing the worker itself. */
export const AUTH_FLOW_KEY = 'authFlow';
export const WATCH_ALARM = 'prospectai-watch-analysis';

export type AuthFlow =
  | { status: 'pending'; startedAt: string }
  | { status: 'succeeded'; finishedAt: string }
  | { status: 'failed'; reason: 'cancelled' | 'rejected' | 'network'; finishedAt: string };
