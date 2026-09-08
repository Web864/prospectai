chrome.runtime.onInstalled.addListener(() => {
  void chrome.storage.local.set({ sessionState: 'disconnected' });
});
chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (!message || typeof message !== 'object' || !('type' in message)) return;
  if (message.type === 'get-session')
    chrome.storage.local
      .get(['sessionState', 'accessToken'])
      .then(({ sessionState, accessToken }) =>
        sendResponse({ sessionState, connected: typeof accessToken === 'string' }),
      )
      .catch(() => sendResponse({ sessionState: 'error', connected: false }));
  return true;
});
