import { extensionTokenResponseSchema } from '@prospectai/validation';
import { API_BASE_URL } from './config';

import { apiFailureCategory, ExtensionApiError } from './api-errors';

const REFRESH_LOCK_NAME = 'prospectai-extension-token-refresh';
// Refresh slightly early so a request never leaves with a token that expires in flight.
const REFRESH_SKEW_MS = 60_000;

function expiresSoon(expiresAt: unknown) {
  const time = typeof expiresAt === 'string' ? Date.parse(expiresAt) : Number.NaN;
  return Number.isFinite(time) && time <= Date.now() + REFRESH_SKEW_MS;
}

/**
 * Refresh tokens rotate: each one is valid exactly once, and replaying a spent token revokes the
 * session. The popup and the service worker both call the API from separate JS contexts, so the
 * refresh is serialized across contexts with the Web Locks API where it is available.
 */
async function withRefreshLock<T>(work: () => Promise<T>): Promise<T> {
  return typeof navigator !== 'undefined' && navigator.locks
    ? navigator.locks.request(REFRESH_LOCK_NAME, work)
    : work();
}

/** Session keys removed when the server says the extension session is over. */
export const sessionTokenKeys = ['accessToken', 'refreshToken', 'accessTokenExpiresAt'] as const;

/**
 * The server rejected the session for good: drop the credentials so no context keeps sending a
 * dead token, and leave a non-secret marker so the UI can say "Your session has expired"
 * instead of silently falling back to guest mode.
 */
export async function markSessionExpired() {
  await chrome.storage.local.remove([...sessionTokenKeys]);
  await chrome.storage.local.set({ sessionState: 'expired' });
}

/**
 * Returns a usable access token, 'revoked' when the server rejected the refresh token for good,
 * or undefined when the refresh could not be attempted (transient failure: tokens are kept).
 */
async function refreshAccessToken(
  staleAccessToken: string,
): Promise<string | 'revoked' | undefined> {
  return withRefreshLock(async () => {
    const stored = await chrome.storage.local.get(['accessToken', 'refreshToken']);
    // Another context rotated the tokens while this one waited for the lock: reuse its result
    // instead of spending the (now stale) refresh token a second time.
    if (typeof stored.accessToken === 'string' && stored.accessToken !== staleAccessToken)
      return stored.accessToken;
    if (typeof stored.refreshToken !== 'string') return undefined;
    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}/extension/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: stored.refreshToken }),
        signal: AbortSignal.timeout(20_000),
      });
    } catch {
      // Transient network failure: keep the tokens so a later request can try again.
      return undefined;
    }
    if (response.status === 401 || response.status === 403) {
      // The server rejected this refresh token for good (expired, revoked or already rotated).
      await chrome.storage.local.remove('refreshToken');
      return 'revoked';
    }
    if (!response.ok) return undefined;
    const parsed = extensionTokenResponseSchema.safeParse(
      await response.json().catch(() => undefined),
    );
    if (!parsed.success) return undefined;
    await chrome.storage.local.set({
      accessToken: parsed.data.data.accessToken,
      refreshToken: parsed.data.data.refreshToken,
      accessTokenExpiresAt: parsed.data.data.expiresAt,
    });
    return parsed.data.data.accessToken;
  });
}

export async function apiRequest(
  path: string,
  init: RequestInit = {},
  options: { binary?: boolean } = {},
) {
  const stored = await chrome.storage.local.get([
    'accessToken',
    'refreshToken',
    'accessTokenExpiresAt',
    'guestToken',
  ]);
  let accessToken = typeof stored.accessToken === 'string' ? stored.accessToken : undefined;
  const canRefresh = accessToken !== undefined && typeof stored.refreshToken === 'string';
  if (accessToken && canRefresh && expiresSoon(stored.accessTokenExpiresAt)) {
    const refreshed = await refreshAccessToken(accessToken);
    if (typeof refreshed === 'string' && refreshed !== 'revoked') accessToken = refreshed;
  }

  const guestToken = typeof stored.guestToken === 'string' ? stored.guestToken : undefined;
  const attempt = async (token: string | undefined) => {
    const headers = new Headers(init.headers);
    if (!options.binary) headers.set('Content-Type', 'application/json');
    if (token) headers.set('Authorization', `Bearer ${token}`);
    else if (guestToken) headers.set('Authorization', 'Guest ' + guestToken);
    const timeout = AbortSignal.timeout(20_000);
    const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, signal });
    } catch (error) {
      const category = timeout.aborted ? 'API_TIMEOUT' : 'NETWORK_UNREACHABLE';
      console.warn('[ProspectAI] API request failed', { endpoint: path.split('?')[0], category });
      if (init.signal?.aborted) throw error;
      throw new ExtensionApiError(category);
    }
    // Binary downloads (PDF) succeed with a non-JSON body; only failures carry a JSON error.
    if (options.binary && response.ok) return response;
    let body: unknown;
    try {
      body = await response.clone().json();
    } catch {
      console.warn('[ProspectAI] API request failed', {
        endpoint: path.split('?')[0],
        status: response.status,
        category: 'API_INVALID_RESPONSE',
      });
      if (response.ok) throw new ExtensionApiError('API_INVALID_RESPONSE');
    }
    if (!response.ok) {
      const code =
        body &&
        typeof body === 'object' &&
        'error' in body &&
        body.error &&
        typeof body.error === 'object' &&
        'code' in body.error &&
        typeof body.error.code === 'string'
          ? body.error.code
          : undefined;
      console.warn('[ProspectAI] API request failed', {
        endpoint: path.split('?')[0],
        status: response.status,
        category: apiFailureCategory(response.status, code),
      });
    }
    return response;
  };

  const response = await attempt(accessToken);
  if (response.status !== 401 || !accessToken) return response;
  // The access token can still be rejected (clock skew, server-side rotation): refresh once, retry once.
  const refreshed = canRefresh ? await refreshAccessToken(accessToken) : 'revoked';
  if (refreshed && refreshed !== 'revoked' && refreshed !== accessToken) {
    const retried = await attempt(refreshed);
    if (retried.status === 401) await markSessionExpired();
    return retried;
  }
  if (refreshed === 'revoked') await markSessionExpired();
  return response;
}
