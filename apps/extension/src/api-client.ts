import { API_BASE_URL } from './config';

import { apiFailureCategory, ExtensionApiError } from './api-errors';

export async function apiRequest(path: string, init: RequestInit = {}) {
  const { accessToken, guestToken } = await chrome.storage.local.get(['accessToken', 'guestToken']);
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (typeof accessToken === 'string') headers.set('Authorization', `Bearer ${accessToken}`);
  else if (typeof guestToken === 'string') headers.set('Authorization', 'Guest ' + guestToken);
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
}
