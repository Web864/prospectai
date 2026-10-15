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
