import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  session: {
    id: 'extension-session',
    status: 'CONNECTED',
    revokedAt: null,
    createdAt: new Date(Date.now() - 60_000),
  },
  prisma: {
    extensionSession: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock('@prospectai/database', () => ({ prisma: mocks.prisma }));
vi.mock('@prospectai/auth', () => ({
  hashSecret: vi.fn((value: string) => 'hash:' + value),
  newOpaqueToken: vi.fn(() => 'new-token'),
}));
vi.mock('@prospectai/config', () => ({
  loadAuthEnvironment: vi.fn(() => ({ EXTENSION_TOKEN_PEPPER: 'test-pepper' })),
}));

import { POST } from './route';

describe('extension refresh rotation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.extensionSession.findUnique.mockResolvedValue(mocks.session);
  });

  it('allows only one concurrent request to rotate a refresh token', async () => {
    mocks.prisma.extensionSession.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    const makeRequest = () =>
      POST(
        new Request('http://localhost/api/v1/extension/refresh', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ refreshToken: 'r'.repeat(48) }),
        }),
      );

    const [first, second] = await Promise.all([makeRequest(), makeRequest()]);
    expect([first.status, second.status].sort()).toEqual([200, 401]);
    expect(mocks.prisma.extensionSession.updateMany).toHaveBeenCalledTimes(2);
  });
});
