import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { openGoogleOAuthState, sealGoogleOAuthState } from './google-oauth';

describe('Google OAuth state', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('SESSION_SECRET', 'test-session-secret-with-at-least-32-characters');
    vi.stubEnv('EXTENSION_TOKEN_PEPPER', 'test-extension-pepper-with-at-least-32-characters');
  });

  afterEach(() => vi.unstubAllEnvs());

  it('round-trips encrypted PKCE state without exposing plaintext', () => {
    const value = {
      state: 'state-value',
      verifier: 'verifier-value',
      requestId: 'request-id',
      expiresAt: Date.now() + 60_000,
    };
    const sealed = sealGoogleOAuthState(value);

    expect(sealed).not.toContain(value.verifier);
    expect(openGoogleOAuthState(sealed)).toEqual(value);
  });

  it('rejects tampered and expired state', () => {
    const valid = sealGoogleOAuthState({
      state: 'state-value',
      verifier: 'verifier-value',
      requestId: 'request-id',
      expiresAt: Date.now() + 60_000,
    });
    const expired = sealGoogleOAuthState({
      state: 'state-value',
      verifier: 'verifier-value',
      requestId: 'request-id',
      expiresAt: Date.now() - 1,
    });

    const tamperedIndex = Math.floor(valid.length / 2);
    const tampered =
      valid.slice(0, tamperedIndex) +
      (valid[tamperedIndex] === 'A' ? 'B' : 'A') +
      valid.slice(tamperedIndex + 1);
    expect(() => openGoogleOAuthState(tampered)).toThrow();
    expect(() => openGoogleOAuthState(expired)).toThrow();
  });
});
