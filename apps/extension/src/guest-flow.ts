import type { GuestSessionSummary } from '@prospectai/types';
import type { ExtensionState } from './state-model';

export const guestStorageKeys = [
  'guestToken',
  'guestSessionId',
  'privacyAcknowledged',
  'currentGuestAnalysisId',
] as const;

export function guestEntryState(
  session: Pick<GuestSessionSummary, 'quotaReached'>,
  privacyAcknowledged: boolean,
): ExtensionState {
  if (session.quotaReached) return 'guest_limit_reached';
  return privacyAcknowledged ? 'guest_ready' : 'first_use_guest';
}

export function guestResultState(partial: boolean): ExtensionState {
  return partial ? 'partial_result' : 'guest_result';
}

export function guestRemainingLabel(
  session: Pick<GuestSessionSummary, 'trialLimit' | 'trialRemaining'>,
) {
  return `${session.trialRemaining} of ${session.trialLimit} free analyses remaining`;
}
