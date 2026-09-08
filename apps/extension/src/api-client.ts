const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://app.prospectai.example/api/v1';
export async function apiRequest(path: string, init: RequestInit = {}) {
  const { accessToken } = await chrome.storage.local.get('accessToken');
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json');
  if (typeof accessToken === 'string') headers.set('authorization', `Bearer ${accessToken}`);
  return fetch(`${API_BASE_URL}${path}`, { ...init, headers });
}
