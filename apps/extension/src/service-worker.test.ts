import { beforeEach, describe, expect, it, vi } from 'vitest';

type MessageListener = (
  message: unknown,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void,
) => boolean | void;

describe('guest authentication handoff', () => {
  let messageListener: MessageListener;
  let storage: Record<string, unknown>;

  beforeEach(async () => {
    vi.resetModules();
    storage = {
      pkceVerifier: 'v'.repeat(48),
      authorizationRequestId: 'authorization-request',
      guestToken: 'g'.repeat(43),
      guestSessionId: 'guest-public-id',
      currentGuestAnalysisId: 'guest-analysis-id',
    };
    const chromeMock = {
      runtime: {
        id: 'prospectai-extension',
        onInstalled: { addListener: vi.fn() },
        onMessage: {
          addListener: vi.fn((listener: MessageListener) => {
            messageListener = listener;
          }),
        },
      },
      storage: {
        local: {
          get: vi.fn(async (keys: string | string[]) => {
            const requested = Array.isArray(keys) ? keys : [keys];
            return Object.fromEntries(requested.map((key) => [key, storage[key]]));
          }),
          set: vi.fn(async (values: Record<string, unknown>) => Object.assign(storage, values)),
          remove: vi.fn(async (keys: string | string[]) => {
            for (const key of Array.isArray(keys) ? keys : [keys]) delete storage[key];
          }),
        },
      },
    };
    vi.stubGlobal('chrome', chromeMock);
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          Response.json({
            data: {
              accessToken: 'access-token',
              refreshToken: 'refresh-token',
              expiresAt: '2030-01-01T00:00:00.000Z',
            },
          }),
        )
        .mockResolvedValueOnce(
          Response.json({
            data: {
              converted: true,
              alreadyConverted: false,
              preservedAnalysisId: 'guest-analysis-id',
            },
          }),
        ),
    );
    await import('./service-worker');
  });

  it('converts the guest once, preserves authentication, and needs no reconnect', async () => {
    const response = await new Promise<{ connected: boolean }>((resolve) => {
      const keepChannelOpen = messageListener(
        { type: 'complete-pairing', code: 'one-time-code' },
        { id: 'prospectai-extension' } as chrome.runtime.MessageSender,
        (value) => resolve(value as { connected: boolean }),
      );
      expect(keepChannelOpen).toBe(true);
    });

    expect(response).toEqual({ connected: true });
    expect(storage).toMatchObject({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      sessionState: 'connected',
    });
    expect(storage.lastConvertedAnalysisId).toBe('guest-analysis-id');
    expect(storage.guestToken).toBeUndefined();
    expect(storage.guestSessionId).toBeUndefined();
    expect(storage.currentGuestAnalysisId).toBeUndefined();
    expect(fetch).toHaveBeenCalledTimes(2);
    const conversion = vi.mocked(fetch).mock.calls[1];
    expect(String(conversion?.[0])).toContain('/guest-sessions/convert');
    expect(new Headers(conversion?.[1]?.headers).get('X-Guest-Token')).toBe('g'.repeat(43));
  });

  it('rejects a duplicate callback after one-time PKCE state is consumed', async () => {
    await new Promise<void>((resolve) => {
      messageListener(
        { type: 'complete-pairing', code: 'one-time-code' },
        { id: 'prospectai-extension' } as chrome.runtime.MessageSender,
        () => resolve(),
      );
    });
    const replay = await new Promise<{ connected: boolean }>((resolve) => {
      messageListener(
        { type: 'complete-pairing', code: 'replayed-code' },
        { id: 'prospectai-extension' } as chrome.runtime.MessageSender,
        (value) => resolve(value as { connected: boolean }),
      );
    });
    expect(replay).toEqual({ connected: false });
    expect(storage.accessToken).toBe('access-token');
  });
});
