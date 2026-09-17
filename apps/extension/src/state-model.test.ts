import { describe, expect, it } from 'vitest';
import {
  extensionStates,
  stateCopy,
  stateFromApiStatus,
  stateFromJobStatus,
  stateFromTab,
} from './state-model';
describe('extension UI states', () => {
  it('has user-facing copy for every required state', () =>
    expect(Object.keys(stateCopy)).toHaveLength(extensionStates.length));
  it('recognizes supported public pages', () =>
    expect(stateFromTab('https://example.com')).toBe('ready'));
  it('rejects browser-internal pages', () =>
    expect(stateFromTab('chrome://settings')).toBe('unsupported_website'));
  it('maps progress without infinite loading', () =>
    expect(stateCopy.opportunity_scoring.progress).toBe(90));
  it('has clear quota and expiry recovery', () => {
    expect(stateCopy.usage_limit_reached.title).toContain('limit');
    expect(stateCopy.session_expired.detail).toContain('Reconnect');
  });

  it('maps expired, revoked, quota, and unavailable API responses', () => {
    expect(stateFromApiStatus(401)).toBe('session_expired');
    expect(stateFromApiStatus(403)).toBe('session_revoked');
    expect(stateFromApiStatus(429)).toBe('usage_limit_reached');
    expect(stateFromApiStatus(503)).toBe('backend_unavailable');
  });
  it('maps PostgreSQL retry and cancellation states for popup polling', () => {
    expect(stateFromJobStatus('retry_pending')).toBe('queued');
    expect(stateFromJobStatus('retrying')).toBe('validating');
    expect(stateFromJobStatus('cancelled')).toBe('failed');
    expect(stateFromJobStatus('fetching')).toBe('fetching');
  });
});
