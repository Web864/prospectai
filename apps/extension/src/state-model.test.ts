import { describe, expect, it } from 'vitest';
import { extensionStates, stateCopy, stateFromTab } from './state-model';
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
});
