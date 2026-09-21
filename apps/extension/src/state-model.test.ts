import { describe, expect, it } from 'vitest';
import {
  guestEntryState,
  guestRemainingLabel,
  guestResultState,
  guestStorageKeys,
} from './guest-flow';
import {
  extensionStates,
  stateCopy,
  stateFromApiStatus,
  stateFromJobStatus,
  stateFromTab,
} from './state-model';

const entitlement = (remaining: number) => ({ quotaReached: remaining === 0 });

describe('value-first extension states', () => {
  it('has user-facing copy for every required state', () =>
    expect(Object.keys(stateCopy)).toHaveLength(extensionStates.length));

  it('opens a fresh install in guest mode instead of requiring an account', () => {
    expect(guestEntryState(entitlement(3), false)).toBe('first_use_guest');
    expect(stateCopy.first_use_guest.title).toContain('prospect');
  });

  it('preserves ready guest state across extension reopen and browser storage reload', () => {
    expect(guestEntryState(entitlement(2), true)).toBe('guest_ready');
    expect(guestEntryState(entitlement(1), true)).toBe('guest_ready');
    expect(guestRemainingLabel({ trialLimit: 3, trialRemaining: 3 })).toBe(
      '3 of 3 free analyses remaining',
    );
    expect(guestRemainingLabel({ trialLimit: 3, trialRemaining: 2 })).toBe(
      '2 of 3 free analyses remaining',
    );
    expect(guestRemainingLabel({ trialLimit: 3, trialRemaining: 1 })).toBe(
      '1 of 3 free analyses remaining',
    );
    expect(guestRemainingLabel({ trialLimit: 3, trialRemaining: 0 })).toBe(
      '0 of 3 free analyses remaining',
    );
  });

  it('shows each completed guest result before progressive registration', () => {
    expect(guestResultState(false)).toBe('guest_result');
    expect(guestEntryState(entitlement(0), true)).toBe('guest_limit_reached');
    expect(stateCopy.guest_limit_reached.detail).toContain('Create your free account');
  });

  it('stores only the minimal guest session and current-result handoff state', () => {
    expect(guestStorageKeys).toEqual([
      'guestToken',
      'guestSessionId',
      'privacyAcknowledged',
      'currentGuestAnalysisId',
    ]);
    expect(guestStorageKeys).not.toContain('pageContent');
    expect(guestStorageKeys).not.toContain('browsingHistory');
  });

  it('supports public sites while keeping internal, local, and LinkedIn pages disabled', () => {
    expect(stateFromTab('https://example.com')).toBe('guest_ready');
    expect(stateFromTab('chrome://settings')).toBe('unsupported_page');
    expect(stateFromTab('http://localhost:3000')).toBe('unsupported_page');
    expect(stateFromTab('https://www.linkedin.com/company/example')).toBe('unsupported_page');
  });

  it('maps guest and registered PostgreSQL job states without infinite loading', () => {
    expect(stateFromJobStatus('fetching', 'guest')).toBe('guest_analyzing');
    expect(stateFromJobStatus('completed', 'guest')).toBe('guest_result');
    expect(stateFromJobStatus('completed', 'registered')).toBe('registered_result');
    expect(stateFromJobStatus('partial', 'guest')).toBe('partial_result');
    expect(stateFromJobStatus('cancelled', 'guest')).toBe('analysis_failed');
  });

  it('separates trial exhaustion from rate limiting and account-session errors', () => {
    expect(stateFromApiStatus(429, 'GUEST_TRIAL_EXHAUSTED')).toBe('guest_limit_reached');
    expect(stateFromApiStatus(429, 'RATE_LIMITED')).toBe('rate_limited');
    expect(stateFromApiStatus(401, 'GUEST_SESSION_EXPIRED')).toBe('first_use_guest');
    expect(stateFromApiStatus(401, 'UNAUTHENTICATED')).toBe('session_expired');
    expect(stateFromApiStatus(401, 'AUTH_HANDOFF_EXPIRED')).toBe('auth_failed');
    expect(stateFromApiStatus(400, 'AUTH_HANDOFF_INVALID')).toBe('auth_failed');
    expect(stateCopy.auth_failed.detail).toContain('guest result is safe');
    expect(stateFromApiStatus(403)).toBe('session_revoked');
    expect(stateFromApiStatus(503)).toBe('backend_unavailable');
  });
});
