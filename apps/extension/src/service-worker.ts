import { extensionTokenResponseSchema } from '@prospectai/validation';
import { apiRequest } from './api-client';

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason !== 'install') return;
  void chrome.storage.local.get('sessionState').then(({ sessionState }) => {
    if (sessionState === undefined)
      return chrome.storage.local.set({ sessionState: 'disconnected' });
  });
});

async function completePairing(code: string) {
  const stored = await chrome.storage.local.get(['pkceVerifier', 'authorizationRequestId']);
  if (typeof stored.pkceVerifier !== 'string' || typeof stored.authorizationRequestId !== 'string')
    throw new Error('No pending authorization request.');
  const response = await apiRequest(
    `/extension/authorization-requests/${encodeURIComponent(stored.authorizationRequestId)}/exchange`,
    {
      method: 'POST',
      body: JSON.stringify({ code, codeVerifier: stored.pkceVerifier }),
    },
  );
  if (!response.ok) throw new Error('Authorization exchange failed.');
  const parsed = extensionTokenResponseSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error('Authorization exchange response was invalid.');
  await chrome.storage.local.set({
    accessToken: parsed.data.data.accessToken,
    refreshToken: parsed.data.data.refreshToken,
    accessTokenExpiresAt: parsed.data.data.expiresAt,
    sessionState: 'connected',
  });
  await chrome.storage.local.remove(['pkceVerifier', 'authorizationRequestId']);
}

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  if (
    sender.id !== chrome.runtime.id ||
    !message ||
    typeof message !== 'object' ||
    !('type' in message)
  )
    return;
  if (message.type === 'get-session') {
    chrome.storage.local
      .get(['sessionState', 'accessToken'])
      .then(({ sessionState, accessToken }) =>
        sendResponse({ sessionState, connected: typeof accessToken === 'string' }),
      )
      .catch(() => sendResponse({ sessionState: 'error', connected: false }));
    return true;
  }
  if (
    message.type === 'complete-pairing' &&
    'code' in message &&
    typeof message.code === 'string'
  ) {
    void completePairing(message.code)
      .then(() => sendResponse({ connected: true }))
      .catch(() => sendResponse({ connected: false }));
    return true;
  }
});
