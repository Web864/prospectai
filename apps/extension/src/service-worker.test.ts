import { beforeEach, describe, expect, it, vi } from 'vitest';

type MessageListener = (
  message: unknown,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void,
) => boolean | void;

const REQUEST_ID = 'authorization-request';
const self = {
  id: 'prospectai-extension',
  url: 'chrome-extension://prospectai-extension/src/popup.html',
} as chrome.runtime.MessageSender;

function area(store: Record<string, unknown>) {
  return {
    get: vi.fn(async (keys: string | string[]) => {
      const requested = Array.isArray(keys) ? keys : [keys];
      return Object.fromEntries(
        requested.filter((key) => key in store).map((key) => [key, store[key]]),
      );
    }),
    set: vi.fn(async (values: Record<string, unknown>) => void Object.assign(store, values)),
    remove: vi.fn(async (keys: string | string[]) => {
      for (const key of Array.isArray(keys) ? keys : [keys]) delete store[key];
    }),
    setAccessLevel: vi.fn(async () => undefined),
  };
}

let messageListener: MessageListener;
let alarmListener: (alarm: { name: string }) => void;
let local: Record<string, unknown>;
let session: Record<string, unknown>;
let badge: string;
let launchWebAuthFlow: ReturnType<typeof vi.fn>;

async function loadWorker() {
  vi.resetModules();
  badge = '';
  launchWebAuthFlow = vi.fn(
    async () =>
      `https://prospectai-extension.chromiumapp.org/prospectai?code=${'c'.repeat(43)}&state=${REQUEST_ID}`,
  );
  vi.stubGlobal('chrome', {
    runtime: {
      id: 'prospectai-extension',
      getURL: (path = '') => `chrome-extension://prospectai-extension/${path}`,
      getManifest: () => ({ version: '1.0.0' }),
      onInstalled: { addListener: vi.fn() },
      onStartup: { addListener: vi.fn() },
      onMessage: {
        addListener: vi.fn((listener: MessageListener) => (messageListener = listener)),
      },
    },
    identity: {
      getRedirectURL: (path = '') => `https://prospectai-extension.chromiumapp.org/${path}`,
      launchWebAuthFlow,
    },
    storage: {
      local: area(local),
      session: area(session),
      onChanged: { addListener: vi.fn() },
    },
    alarms: {
      create: vi.fn(async () => undefined),
      clear: vi.fn(async () => true),
      get: vi.fn(async () => undefined),
      onAlarm: { addListener: vi.fn((listener) => (alarmListener = listener)) },
    },
    action: {
      setBadgeText: vi.fn(async ({ text }: { text: string }) => void (badge = text)),
      setBadgeBackgroundColor: vi.fn(async () => undefined),
      setTitle: vi.fn(async () => undefined),
    },
  });
  await import('./service-worker');
}

const send = (message: unknown, sender = self) =>
  new Promise<unknown>((resolve) => {
    const result = messageListener(message, sender, resolve);
    if (result !== true) setTimeout(() => resolve('no-response'), 0);
  });
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
const until = async (check: () => boolean) => {
  for (let index = 0; index < 50 && !check(); index += 1) await settle();
};

beforeEach(() => {
  local = { guestToken: 'g'.repeat(43), guestSessionId: 'guest-public-id' };
  session = {};
});

describe('sign-in runs in the service worker', () => {
  beforeEach(async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string) => {
        const url = String(input);
        if (url.endsWith('/extension/authorization-requests'))
          return Response.json(
            {
              data: {
                id: REQUEST_ID,
                authorizationUrl: 'https://app.example.org/extension/connect?request=' + REQUEST_ID,
                expiresAt: '2030-01-01T00:00:00.000Z',
              },
            },
            { status: 201 },
          );
        if (url.endsWith('/exchange'))
          return Response.json({
            data: {
              accessToken: 'access-token',
              refreshToken: 'refresh-token',
              expiresAt: '2030-01-01T00:00:00.000Z',
            },
          });
        if (url.endsWith('/guest-sessions/convert'))
          return Response.json({
            data: {
              converted: true,
              alreadyConverted: false,
              preservedAnalysisId: 'guest-analysis-id',
            },
          });
        return Response.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
      }),
    );
    await loadWorker();
  });

  it('answers the popup immediately and finishes even after the popup has closed', async () => {
    expect(await send({ type: 'start-sign-in', provider: 'google' })).toEqual({ started: true });
    await until(
      () => (session.authFlow as { status?: string } | undefined)?.status === 'succeeded',
    );
    expect(session.authFlow).toMatchObject({ status: 'succeeded' });
    expect(local).toMatchObject({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      sessionState: 'connected',
      lastConvertedAnalysisId: 'guest-analysis-id',
    });
    expect(local.guestToken).toBeUndefined();
    // The PKCE verifier never touches storage.
    expect(JSON.stringify({ local, session })).not.toContain('codeVerifier');
    const conversion = vi
      .mocked(fetch)
      .mock.calls.find(([url]) => String(url).endsWith('/convert'));
    expect(new Headers(conversion?.[1]?.headers).get('X-Guest-Token')).toBe('g'.repeat(43));
  });

  it('rejects a callback whose state does not match the request', async () => {
    launchWebAuthFlow.mockResolvedValueOnce(
      `https://prospectai-extension.chromiumapp.org/prospectai?code=${'c'.repeat(43)}&state=forged`,
    );
    await send({ type: 'start-sign-in', provider: 'account' });
    await until(() => (session.authFlow as { status?: string } | undefined)?.status === 'failed');
    expect(session.authFlow).toMatchObject({ status: 'failed', reason: 'rejected' });
    expect(local.accessToken).toBeUndefined();
  });

  it('reports a closed sign-in window as cancelled and keeps the guest', async () => {
    launchWebAuthFlow.mockRejectedValueOnce(new Error('The user did not approve access.'));
    await send({ type: 'start-sign-in', provider: 'account' });
    await until(() => (session.authFlow as { status?: string } | undefined)?.status === 'failed');
    expect(session.authFlow).toMatchObject({ reason: 'cancelled' });
    expect(local.guestToken).toBe('g'.repeat(43));
  });

  it('ignores messages from web pages and unknown message types', async () => {
    expect(
      await send({ type: 'sign-out' }, { id: 'other-extension' } as chrome.runtime.MessageSender),
    ).toBe('no-response');
    expect(
      await send({ type: 'sign-out' }, {
        id: 'prospectai-extension',
        url: 'https://evil.example/',
        tab: { id: 3 },
      } as unknown as chrome.runtime.MessageSender),
    ).toBe('no-response');
    expect(await send({ type: 'complete-pairing', code: 'x' })).toBe('no-response');
    expect(await send('sign-out')).toBe('no-response');
  });
});

describe('sign-out', () => {
  it('revokes the server session and removes every account-scoped value but the theme', async () => {
    local = {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      accessTokenExpiresAt: '2030-01-01T00:00:00.000Z',
      sessionState: 'connected',
      activeAnalysis: { jobId: 'job' },
      pendingAnalysisSubmission: { key: 'k' },
      lastConvertedAnalysisId: 'a',
      theme: 'dark',
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ data: { message: 'Extension disconnected.' } })),
    );
    await loadWorker();
    expect(await send({ type: 'sign-out' })).toEqual({ ok: true });
    const [url, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(url)).toMatch(/\/extension\/session$/);
    expect(init?.method).toBe('DELETE');
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer access-token');
    expect(local).toEqual({ theme: 'dark' });
  });

  it('still removes local credentials when the server is unreachable', async () => {
    local = { accessToken: 'access-token', refreshToken: 'refresh-token' };
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))),
    );
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await loadWorker();
    expect(await send({ type: 'sign-out' })).toEqual({ ok: true });
    expect(local.accessToken).toBeUndefined();
  });
});

describe('background job watch', () => {
  const job = (status: string) =>
    Response.json({
      data: {
        id: 'job-1',
        analysisId: 'analysis-1',
        status,
        progress: status === 'completed' ? 100 : 40,
        attempt: 1,
        maxAttempts: 3,
        nextAttemptAt: '2026-11-26T12:00:00.000Z',
        startedAt: '2026-11-26T12:00:00.000Z',
        finishedAt: null,
        errorCode: null,
        errorMessage: null,
        updatedAt: '2026-11-26T12:00:10.000Z',
      },
    });

  it('marks the icon while the popup is closed and when the job finishes', async () => {
    local.activeAnalysis = {
      jobId: 'job-1',
      mode: 'guest',
      url: 'https://example.com/',
      domain: 'example.com',
      submittedAt: new Date().toISOString(),
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(job('extracting')).mockResolvedValueOnce(job('completed')),
    );
    await loadWorker();
    alarmListener({ name: 'prospectai-watch-analysis' });
    await until(() => (local.activeAnalysis as { status?: string }).status === 'extracting');
    expect(badge).toBe('…');
    alarmListener({ name: 'prospectai-watch-analysis' });
    await until(() => badge === '✓');
    expect(local.activeAnalysis).toMatchObject({ status: 'completed' });
  });

  it('forgets a job the server no longer knows', async () => {
    local.activeAnalysis = {
      jobId: 'job-1',
      mode: 'guest',
      url: 'https://example.com/',
      domain: 'example.com',
      submittedAt: new Date().toISOString(),
    };
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })),
    );
    await loadWorker();
    alarmListener({ name: 'prospectai-watch-analysis' });
    await until(() => local.activeAnalysis === undefined);
    expect(local.activeAnalysis).toBeUndefined();
    expect(badge).toBe('');
  });
});
