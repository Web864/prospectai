import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const transaction = {
    user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    authSession: { updateMany: vi.fn() },
    extensionSession: { updateMany: vi.fn() },
    authActionToken: { deleteMany: vi.fn() },
    organization: { create: vi.fn() },
    membership: { create: vi.fn() },
  };
  return {
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
  hashSecret: vi.fn(),
  newOpaqueToken: vi.fn(),
  verifyPassword: vi.fn(),
}));
vi.mock('@prospectai/config', () => ({
  loadAuthEnvironment: vi.fn(),
  loadPublicEnvironment: vi.fn(),
  loadServerEnvironment: vi.fn(() => ({ NODE_ENV: 'test' })),
}));
vi.mock('./email', () => ({ sendTransactionalEmail: vi.fn() }));

import { findOrCreateGoogleAccount } from './auth-service';

const membership = { organizationId: 'org-1' };

describe('Google account linking', () => {
  beforeEach(() => vi.clearAllMocks());

  it('discards an unverified password and its sessions before linking (pre-account takeover)', async () => {
    mocks.transaction.user.findUnique.mockResolvedValue({
      id: 'user-1',
      emailVerifiedAt: null,
      passwordHash: 'scrypt$attacker',
      memberships: [membership],
    });
    mocks.transaction.user.update.mockResolvedValue({
      id: 'user-1',
      emailVerifiedAt: new Date(),
      passwordHash: null,
      memberships: [membership],
    });

    const account = await findOrCreateGoogleAccount('Victim@Example.com');

    expect(mocks.transaction.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: expect.objectContaining({ passwordHash: null }),
      }),
    );
    expect(mocks.transaction.authSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1', revokedAt: null } }),
    );
    expect(mocks.transaction.extensionSession.updateMany).toHaveBeenCalled();
    expect(account.organizationId).toBe('org-1');
  });

  it('keeps the password of an account whose email was already verified', async () => {
    mocks.transaction.user.findUnique.mockResolvedValue({
      id: 'user-2',
      emailVerifiedAt: new Date(),
      passwordHash: 'scrypt$owner',
      memberships: [membership],
    });

    await findOrCreateGoogleAccount('owner@example.com');

    expect(mocks.transaction.user.update).not.toHaveBeenCalled();
    expect(mocks.transaction.authSession.updateMany).not.toHaveBeenCalled();
  });
});
