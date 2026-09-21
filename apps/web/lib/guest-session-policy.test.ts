import { describe, expect, it } from 'vitest';
import { guestSessionAccessError } from './guest-session-policy';

const now = new Date('2026-09-17T00:00:00.000Z');

describe('guest session access policy', () => {
  it('accepts an active unexpired guest session', () => {
    expect(guestSessionAccessError('active', new Date('2026-09-18T00:00:00.000Z'), now)).toBeNull();
  });

  it('rejects an expired guest session', () => {
    expect(guestSessionAccessError('active', new Date('2026-09-16T00:00:00.000Z'), now)).toBe(
      'GUEST_SESSION_EXPIRED',
    );
    expect(guestSessionAccessError('expired', new Date('2026-09-18T00:00:00.000Z'), now)).toBe(
      'GUEST_SESSION_EXPIRED',
    );
  });

  it('rejects converted and revoked guest sessions', () => {
    expect(guestSessionAccessError('converted', new Date('2026-09-18T00:00:00.000Z'), now)).toBe(
      'GUEST_SESSION_INVALID',
    );
    expect(guestSessionAccessError('revoked', new Date('2026-09-18T00:00:00.000Z'), now)).toBe(
      'GUEST_SESSION_INVALID',
    );
  });
});
