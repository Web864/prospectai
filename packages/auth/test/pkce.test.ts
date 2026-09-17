import { describe, expect, it } from 'vitest';
import { codeChallengeFor, verifyPkce } from '../src/index';

describe('PKCE verification', () => {
  it('accepts the matching verifier and challenge', () => {
    const verifier = 'test-verifier-with-sufficient-entropy';
    expect(verifyPkce(verifier, codeChallengeFor(verifier))).toBe(true);
  });

  it('rejects malformed challenges without throwing', () => {
    expect(() => verifyPkce('verifier', 'short')).not.toThrow();
    expect(verifyPkce('verifier', 'short')).toBe(false);
  });
});
