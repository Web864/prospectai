import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const calls: string[] = [];
  const transaction = {
    $executeRaw: vi.fn(async () => {
      calls.push('lock');
      return 1;
    }),
    authActionToken: {
      deleteMany: vi.fn(async () => {
        calls.push('delete');
        return { count: 1 };
      }),
      create: vi.fn(async () => {
        calls.push('create');
        return { id: 'action' };
      }),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
  };
  return {
    calls,
    transaction,
    prisma: {
      $transaction: vi.fn(async (work: (value: typeof transaction) => unknown) =>
        work(transaction),
      ),
    },
  };
});

vi.mock('@prospectai/database', () => ({ prisma: mocks.prisma }));
vi.mock('@prospectai/auth', () => ({
  hashPassword: vi.fn(),
  hashSecret: vi.fn(() => 'hashed-token'),
  newOpaqueToken: vi.fn(() => 'opaque-token'),
  verifyPassword: vi.fn(),
}));
vi.mock('@prospectai/config', () => ({
  loadAuthEnvironment: vi.fn(() => ({ SESSION_SECRET: 'test-secret' })),
  loadPublicEnvironment: vi.fn(() => ({ NEXT_PUBLIC_APP_URL: 'http://localhost:3000' })),
  loadServerEnvironment: vi.fn(() => ({ NODE_ENV: 'test' })),
}));
vi.mock('./email', () => ({ sendTransactionalEmail: vi.fn() }));

import { consumeAuthAction, issueAuthAction } from './auth-service';

describe('auth action database concurrency', () => {
  beforeEach(() => {
    mocks.calls.length = 0;
    vi.clearAllMocks();
  });

  it('serializes replacement tokens before deleting the prior token', async () => {
    await issueAuthAction('user-1', 'PASSWORD_RESET');

    expect(mocks.calls).toEqual(['lock', 'delete', 'create']);
  });

  it('consumes a token with a compare-and-set update', async () => {
    const record = {
      id: 'action-1',
      userId: 'user-1',
      kind: 'PASSWORD_RESET',
      tokenHash: 'hashed-token',
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
      createdAt: new Date(),
    };
    mocks.transaction.authActionToken.findUnique.mockResolvedValue(record);
    mocks.transaction.authActionToken.updateMany.mockResolvedValue({ count: 1 });

    await expect(consumeAuthAction('token', 'PASSWORD_RESET')).resolves.toEqual(record);
    expect(mocks.transaction.authActionToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'action-1', kind: 'PASSWORD_RESET', usedAt: null }),
      }),
    );
  });

  it('rejects a token lost to a concurrent consumer', async () => {
    mocks.transaction.authActionToken.findUnique.mockResolvedValue({
      id: 'action-1',
      userId: 'user-1',
      kind: 'PASSWORD_RESET',
      tokenHash: 'hashed-token',
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
      createdAt: new Date(),
    });
    mocks.transaction.authActionToken.updateMany.mockResolvedValue({ count: 0 });

    await expect(consumeAuthAction('token', 'PASSWORD_RESET')).rejects.toMatchObject({
      code: 'AUTH_EXPIRED',
      status: 401,
    });
  });
});
