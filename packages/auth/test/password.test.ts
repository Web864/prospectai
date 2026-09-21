import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../src/index';

describe('password hashing', () => {
  it('uses a unique salted scrypt hash and verifies the original password', async () => {
    const first = await hashPassword('correct horse battery staple');
    const second = await hashPassword('correct horse battery staple');

    expect(first).not.toBe(second);
    await expect(verifyPassword('correct horse battery staple', first)).resolves.toBe(true);
    await expect(verifyPassword('wrong password', first)).resolves.toBe(false);
  });

  it('rejects malformed stored hashes', async () => {
    await expect(verifyPassword('password', 'not-a-supported-hash')).resolves.toBe(false);
  });
});
