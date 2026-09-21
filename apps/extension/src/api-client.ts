import { API_BASE_URL } from './config';

export async function apiRequest(path: string, init: RequestInit = {}) {
  const { accessToken, guestToken } = await chrome.storage.local.get(['accessToken', 'guestToken']);
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (typeof accessToken === 'string') headers.set('Authorization', `Bearer ${accessToken}`);
  else if (typeof guestToken === 'string') headers.set('Authorization', 'Guest ' + guestToken);
  const timeout = AbortSignal.timeout(20_000);
  const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  return fetch(`${API_BASE_URL}${path}`, { ...init, headers, signal });
}
