import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from './api-client';
import { API_BASE_URL } from './config';
import { ExtensionApiError } from './api-errors';
import { stateFromApiStatus, stateFromRequestError } from './state-model';

describe('extension API boundary', () => {
  const fetcher = vi.fn<typeof fetch>();
  beforeEach(() => {
    fetcher.mockReset();
    vi.stubGlobal('fetch', fetcher);
    vi.stubGlobal('chrome', {
      storage: { local: { get: vi.fn(async () => ({ guestToken: 'test-guest-token' })) } },
    });
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('uses the configured local API and preserves the guest authorization scheme', async () => {
    fetcher.mockResolvedValue(
      Response.json({ data: { sessionId: 'test-session' } }, { status: 201 }),
    );
    const response = await apiRequest('/guest-sessions', { method: 'POST' });
    expect(fetcher.mock.calls[0]?.[0]).toBe(`${API_BASE_URL}/guest-sessions`);
    expect(new Headers(fetcher.mock.calls[0]?.[1]?.headers).get('Authorization')).toBe(
      'Guest test-guest-token',
    );
    expect(await response.json()).toEqual({ data: { sessionId: 'test-session' } });
  });

  it.each([
    [401, 'API_UNAUTHORIZED', 'session_expired'],
    [403, 'API_FORBIDDEN', 'session_revoked'],
    [404, 'API_NOT_FOUND', 'api_not_found'],
    [429, 'API_RATE_LIMITED', 'rate_limited'],
    [500, 'API_SERVER_ERROR', 'api_server_error'],
  ] as const)(
    'distinguishes HTTP %i from a connection failure',
    async (status, category, state) => {
      fetcher.mockResolvedValue(Response.json({ error: { code: 'TEST_ERROR' } }, { status }));
      const response = await apiRequest('/guest-sessions');
      expect(response.status).toBe(status);
      expect(console.warn).toHaveBeenCalledWith('[ProspectAI] API request failed', {
        endpoint: '/guest-sessions',
        status,
        category,
      });
      expect(stateFromApiStatus(status)).toBe(state);
      expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain('test-guest-token');
    },
  );

  it('separates transport, malformed JSON, offline and timeout errors', async () => {
    fetcher.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(apiRequest('/guest-sessions')).rejects.toMatchObject({
      category: 'NETWORK_UNREACHABLE',
    });
    fetcher.mockResolvedValue(new Response('<html>Proxy error</html>', { status: 200 }));
    await expect(apiRequest('/guest-sessions')).rejects.toMatchObject({
      category: 'API_INVALID_RESPONSE',
    });
    expect(stateFromRequestError(new ExtensionApiError('API_TIMEOUT'), true)).toBe('api_timeout');
    expect(stateFromRequestError(new ExtensionApiError('NETWORK_UNREACHABLE'), true)).toBe(
      'backend_unavailable',
    );
    expect(stateFromRequestError(new ExtensionApiError('NETWORK_UNREACHABLE'), false)).toBe(
      'offline',
    );
  });

  it('preserves expired guest and exhausted trial semantics', async () => {
    expect(stateFromApiStatus(401, 'GUEST_SESSION_EXPIRED')).toBe('first_use_guest');
    expect(stateFromApiStatus(429, 'GUEST_TRIAL_EXHAUSTED')).toBe('guest_limit_reached');
    expect(stateFromApiStatus(504, 'ANALYSIS_TIMEOUT')).toBe('analysis_timed_out');
    expect(stateFromApiStatus(502, 'AI_UNAVAILABLE')).toBe('api_server_error');
  });
});

describe('extension token refresh', () => {
  const fetcher = vi.fn<typeof fetch>();
  let store: Record<string, unknown>;
  const minutes = (count: number) => new Date(Date.now() + count * 60_000).toISOString();
  const tokenBody = (suffix: string) => ({
    data: {
      accessToken: `access-${suffix}`,
      refreshToken: `refresh-${suffix}`,
      expiresAt: minutes(60),
    },
  });
  const bearerOf = (call: number) =>
    new Headers(fetcher.mock.calls[call]?.[1]?.headers).get('Authorization');
  const urlOf = (call: number) => String(fetcher.mock.calls[call]?.[0]);

  beforeEach(() => {
    fetcher.mockReset();
    store = {
      accessToken: 'access-0',
      refreshToken: 'refresh-0',
      accessTokenExpiresAt: minutes(30),
    };
    vi.stubGlobal('fetch', fetcher);
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: vi.fn(async (keys: string[]) =>
            Object.fromEntries(keys.filter((key) => key in store).map((key) => [key, store[key]])),
          ),
          set: vi.fn(async (values: Record<string, unknown>) => void Object.assign(store, values)),
          remove: vi.fn(async (key: string) => void delete store[key]),
        },
      },
    });
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('does not refresh a token that is comfortably valid', async () => {
    fetcher.mockResolvedValue(Response.json({ data: {} }));
    await apiRequest('/me');
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(bearerOf(0)).toBe('Bearer access-0');
  });

  it('refreshes before sending when the token is about to expire', async () => {
    store.accessTokenExpiresAt = minutes(0.5);
    fetcher
      .mockResolvedValueOnce(Response.json(tokenBody('1')))
      .mockResolvedValueOnce(Response.json({ data: {} }));
    const response = await apiRequest('/me');
    expect(response.ok).toBe(true);
    expect(urlOf(0)).toBe(`${API_BASE_URL}/extension/refresh`);
    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toEqual({
      refreshToken: 'refresh-0',
    });
    expect(urlOf(1)).toBe(`${API_BASE_URL}/me`);
    expect(bearerOf(1)).toBe('Bearer access-1');
    expect(store).toMatchObject({ accessToken: 'access-1', refreshToken: 'refresh-1' });
  });

  it('refreshes and retries once when the server rejects the access token', async () => {
    fetcher
      .mockResolvedValueOnce(Response.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401 }))
      .mockResolvedValueOnce(Response.json(tokenBody('1')))
      .mockResolvedValueOnce(Response.json({ data: {} }));
    const response = await apiRequest('/me');
    expect(response.ok).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(bearerOf(0)).toBe('Bearer access-0');
    expect(bearerOf(2)).toBe('Bearer access-1');
  });

  it('gives up cleanly when the session is gone for good, without looping', async () => {
    fetcher
      .mockResolvedValueOnce(Response.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401 }))
      .mockResolvedValueOnce(
        Response.json({ error: { code: 'SESSION_REVOKED' } }, { status: 401 }),
      );
    const response = await apiRequest('/me');
    expect(response.status).toBe(401);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect('refreshToken' in store).toBe(false);
    // With the dead refresh token cleared, later requests no longer hit the refresh endpoint.
    fetcher.mockResolvedValueOnce(
      Response.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401 }),
    );
    await apiRequest('/me');
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('keeps the tokens when the refresh endpoint is temporarily unreachable', async () => {
    fetcher
      .mockResolvedValueOnce(Response.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401 }))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const response = await apiRequest('/me');
    expect(response.status).toBe(401);
    expect(store).toMatchObject({ accessToken: 'access-0', refreshToken: 'refresh-0' });
  });

  it('spends a rotating refresh token only once when contexts refresh concurrently', async () => {
    // Web Locks stand-in: one holder at a time, like the real API across popup and worker.
    let tail: Promise<unknown> = Promise.resolve();
    vi.stubGlobal('navigator', {
      locks: {
        request: <T>(_name: string, work: () => Promise<T>) => {
          const run = tail.then(work, work);
          tail = run.catch(() => undefined);
          return run;
        },
      },
    });
    fetcher.mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith('/extension/refresh')) return Response.json(tokenBody('1'));
      const bearer = new Headers(init?.headers).get('Authorization');
      return bearer === 'Bearer access-1'
        ? Response.json({ data: {} })
        : Response.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401 });
    });
    const responses = await Promise.all([
      apiRequest('/me'),
      apiRequest('/usage'),
      apiRequest('/leads'),
    ]);
    expect(responses.every((response) => response.ok)).toBe(true);
    const refreshCalls = fetcher.mock.calls.filter(([url]) =>
      String(url).endsWith('/extension/refresh'),
    );
    expect(refreshCalls).toHaveLength(1);
  });
});
