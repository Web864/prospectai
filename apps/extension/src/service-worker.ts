import {
  analysisJobProgressResponseSchema,
  extensionAuthorizationCreatedSchema,
  extensionTokenResponseSchema,
  guestConversionResponseSchema,
} from '@prospectai/validation';
import { apiRequest, sessionTokenKeys } from './api-client';
import {
  ACTIVE_ANALYSIS_KEY,
  clearActiveAnalysis,
  legacyJobKeys,
  patchActiveAnalysis,
  PENDING_SUBMISSION_KEY,
  readActiveAnalysis,
} from './job-store';
import { createPkcePair } from './pkce';
import { AUTH_FLOW_KEY, type AuthFlow, WATCH_ALARM } from './service-worker-contract';
import { isTerminalStatus } from './state-model';

/**
 * Manifest V3 service worker. It is stopped after ~30 s idle, so it keeps no state in globals
 * that matters after a restart: everything it needs is re-read from chrome.storage. Listeners
 * are registered synchronously at top level so Chrome can wake the worker for them.
 */

const guestKeys = ['guestToken', 'guestSessionId', 'privacyAcknowledged'];

async function setAuthFlow(flow: AuthFlow) {
  await chrome.storage.session.set({ [AUTH_FLOW_KEY]: flow });
}

async function convertStoredGuest() {
  const stored = await chrome.storage.local.get(['guestToken', 'guestSessionId']);
  if (typeof stored.guestToken !== 'string' || typeof stored.guestSessionId !== 'string') return;
  let response: Response;
  try {
    response = await apiRequest('/guest-sessions/convert', {
      method: 'POST',
      headers: { 'X-Guest-Token': stored.guestToken },
      body: JSON.stringify({ guestSessionId: stored.guestSessionId }),
    });
  } catch {
    // Transient: guest keys stay so the popup can retry the conversion on its next open.
    return;
  }
  if (!response.ok) {
    if (response.status === 401 || response.status === 409)
      await chrome.storage.local.remove(guestKeys);
    return;
  }
  const parsed = guestConversionResponseSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) return;
  const active = await readActiveAnalysis();
  // Guest analyses (and their jobs) move into the account on conversion. A running job keeps
  // its record and is resumed with the new credentials; otherwise show the preserved result.
  if (active) await patchActiveAnalysis(active.jobId, { mode: 'registered' });
  else if (parsed.data.data.preservedAnalysisId)
    await chrome.storage.local.set({
      lastConvertedAnalysisId: parsed.data.data.preservedAnalysisId,
    });
  await chrome.storage.local.remove(guestKeys);
}

/**
 * The whole sign-in runs here, not in the popup: Chrome closes the popup as soon as the sign-in
 * window takes focus, which would destroy a flow running in the popup. identity.launchWebAuthFlow
 * is exempt from the service worker's 5-minute request limit.
 */
async function runSignIn(provider: 'google' | 'account') {
  await setAuthFlow({ status: 'pending', startedAt: new Date().toISOString() });
  try {
    const { verifier, challenge } = await createPkcePair();
    const created = await apiRequest('/extension/authorization-requests', {
      method: 'POST',
      body: JSON.stringify({
        extensionVersion: chrome.runtime.getManifest().version,
        codeChallenge: challenge,
        deviceName: 'Chrome extension',
        preferredProvider: provider,
        redirectUri: chrome.identity.getRedirectURL('prospectai'),
      }),
    });
    if (!created.ok) throw new Error('rejected');
    const request = extensionAuthorizationCreatedSchema.safeParse(
      await created.json().catch(() => null),
    );
    if (!request.success) throw new Error('rejected');
    let callbackUrl: string | undefined;
    try {
      callbackUrl = await chrome.identity.launchWebAuthFlow({
        url: request.data.data.authorizationUrl,
        interactive: true,
      });
    } catch {
      throw new Error('cancelled');
    }
    if (!callbackUrl) throw new Error('cancelled');
    const callback = new URL(callbackUrl);
    // The redirect must be ours and carry the state we created (CSRF / mix-up protection).
    if (
      callback.origin !== new URL(chrome.identity.getRedirectURL()).origin ||
      callback.searchParams.get('state') !== request.data.data.id
    )
      throw new Error('rejected');
    const code = callback.searchParams.get('code');
    if (!code) throw new Error('rejected');
    const exchanged = await apiRequest(
      `/extension/authorization-requests/${encodeURIComponent(request.data.data.id)}/exchange`,
      { method: 'POST', body: JSON.stringify({ code, codeVerifier: verifier }) },
    );
    if (!exchanged.ok) throw new Error('rejected');
    const tokens = extensionTokenResponseSchema.safeParse(await exchanged.json().catch(() => null));
    if (!tokens.success) throw new Error('rejected');
    await chrome.storage.local.set({
      accessToken: tokens.data.data.accessToken,
      refreshToken: tokens.data.data.refreshToken,
      accessTokenExpiresAt: tokens.data.data.expiresAt,
      sessionState: 'connected',
    });
    await convertStoredGuest();
    await setAuthFlow({ status: 'succeeded', finishedAt: new Date().toISOString() });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    await setAuthFlow({
      status: 'failed',
      reason:
        message === 'cancelled' ? 'cancelled' : message === 'rejected' ? 'rejected' : 'network',
      finishedAt: new Date().toISOString(),
    });
  }
}

/** Revokes the extension session on the server and removes every account-scoped value. */
async function signOut() {
  try {
    await apiRequest('/extension/session', {
      method: 'DELETE',
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    // Offline sign-out still removes local credentials; the server session expires on its own.
  }
  await chrome.storage.local.remove([
    ...sessionTokenKeys,
    'sessionState',
    ACTIVE_ANALYSIS_KEY,
    PENDING_SUBMISSION_KEY,
    'lastConvertedAnalysisId',
    ...guestKeys,
    ...legacyJobKeys,
  ]);
  await chrome.storage.session.remove(AUTH_FLOW_KEY);
  await chrome.alarms.clear(WATCH_ALARM);
  await setBadge('none');
}

async function setBadge(state: 'running' | 'done' | 'failed' | 'none') {
  const text = { running: '…', done: '✓', failed: '!', none: '' }[state];
  await chrome.action.setBadgeText({ text });
  if (state !== 'none')
    await chrome.action.setBadgeBackgroundColor({
      color: state === 'failed' ? '#b42318' : '#06776e',
    });
  await chrome.action.setTitle({
    title:
      state === 'running'
        ? 'ProspectAI: analysis in progress'
        : state === 'done'
          ? 'ProspectAI: analysis ready'
          : state === 'failed'
            ? 'ProspectAI: analysis needs attention'
            : 'ProspectAI: analyze this website',
  });
}

/** One background check of the stored job, so the badge tells the truth while the popup is closed. */
export async function checkActiveAnalysis() {
  const record = await readActiveAnalysis();
  if (!record) {
    await chrome.alarms.clear(WATCH_ALARM);
    return setBadge('none');
  }
  if (isTerminalStatus(record.status)) {
    await chrome.alarms.clear(WATCH_ALARM);
    if (record.seen) return setBadge('none');
    return setBadge(
      record.status === 'completed' || record.status === 'partial' ? 'done' : 'failed',
    );
  }
  await setBadge('running');
  let response: Response;
  try {
    response = await apiRequest(`/analysis-jobs/${encodeURIComponent(record.jobId)}`);
  } catch {
    return; // Transient: the next alarm checks again.
  }
  if (response.status === 404) {
    await clearActiveAnalysis(record.jobId);
    return setBadge('none');
  }
  if (!response.ok) return;
  const parsed = analysisJobProgressResponseSchema.safeParse(
    await response.json().catch(() => null),
  );
  if (!parsed.success) return;
  const status = parsed.data.data.status;
  await patchActiveAnalysis(record.jobId, { status });
  if (isTerminalStatus(status)) {
    await chrome.alarms.clear(WATCH_ALARM);
    await setBadge(status === 'completed' || status === 'partial' ? 'done' : 'failed');
  }
}

async function ensureWatch() {
  const record = await readActiveAnalysis();
  if (record && !isTerminalStatus(record.status)) {
    // 30 s is the shortest alarm period Chrome allows (Chrome 120+).
    if (!(await chrome.alarms.get(WATCH_ALARM)))
      await chrome.alarms.create(WATCH_ALARM, { periodInMinutes: 0.5, delayInMinutes: 0.5 });
    await setBadge('running');
  } else await checkActiveAnalysis();
}

chrome.runtime.onInstalled.addListener(({ reason }) => {
  void (async () => {
    if (reason === 'install') await chrome.storage.local.remove(['sessionState']);
    // Older builds kept job state under separate keys that this build no longer reads.
    await chrome.storage.local.remove([...legacyJobKeys, 'pkceVerifier', 'authorizationRequestId']);
    // Session storage is only readable by extension pages and this worker (the default), never
    // by content scripts; set it explicitly because it holds sign-in progress.
    await chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
    await ensureWatch();
  })();
});

chrome.runtime.onStartup.addListener(() => void ensureWatch());

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === WATCH_ALARM) void checkActiveAnalysis();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && ACTIVE_ANALYSIS_KEY in changes) void ensureWatch();
});

type Message =
  | { type: 'start-sign-in'; provider: 'google' | 'account' }
  | { type: 'sign-out' }
  | { type: 'convert-guest' };

function parseMessage(message: unknown): Message | undefined {
  if (!message || typeof message !== 'object' || !('type' in message)) return undefined;
  const { type } = message as { type: unknown };
  if (type === 'sign-out' || type === 'convert-guest') return { type };
  if (type === 'start-sign-in') {
    const provider = (message as { provider?: unknown }).provider;
    return { type, provider: provider === 'google' ? 'google' : 'account' };
  }
  return undefined;
}

chrome.runtime.onMessage.addListener((raw: unknown, sender, sendResponse) => {
  // Only this extension's own pages may drive it (never a content script, whose sender URL is
  // the web page). There are no content scripts and no externally_connectable, so web pages
  // cannot reach this listener at all; the check is defence in depth.
  if (sender.id !== chrome.runtime.id || !sender.url?.startsWith(chrome.runtime.getURL(''))) return;
  const message = parseMessage(raw);
  if (!message) return;
  if (message.type === 'start-sign-in') {
    // Answer immediately: the popup will be closed by the sign-in window before the flow ends.
    void runSignIn(message.provider);
    sendResponse({ started: true });
    return;
  }
  const work = message.type === 'sign-out' ? signOut() : convertStoredGuest();
  void work.then(
    () => sendResponse({ ok: true }),
    () => sendResponse({ ok: false }),
  );
  return true;
});
