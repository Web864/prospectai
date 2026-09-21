import type { GuestSessionStatus } from '@prospectai/types';

export type GuestSessionAccessError = 'GUEST_SESSION_EXPIRED' | 'GUEST_SESSION_INVALID';

export function guestSessionAccessError(
  status: GuestSessionStatus,
  expiresAt: Date,
  now = new Date(),
): GuestSessionAccessError | null {
  if (status === 'expired' || expiresAt <= now) return 'GUEST_SESSION_EXPIRED';
  return status === 'active' ? null : 'GUEST_SESSION_INVALID';
}
