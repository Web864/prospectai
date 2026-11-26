import { describe, expect, it } from 'vitest';
import { assertAllowedExtensionRedirect } from './extension-redirect';

const published = 'abcdefghijklmnopabcdefghijklmnop';

describe('extension redirect allowlist', () => {
  it('accepts the published extension redirect', () => {
    expect(() =>
      assertAllowedExtensionRedirect(`https://${published}.chromiumapp.org/cb`, published),
    ).not.toThrow();
  });

  it('rejects another extension when an allowlist is configured', () => {
    expect(() =>
      assertAllowedExtensionRedirect('https://attackerextensionid.chromiumapp.org/', published),
    ).toThrow(/not authorized/);
  });

  it('allows any Chrome identity redirect when no allowlist is configured (development)', () => {
    expect(() =>
      assertAllowedExtensionRedirect('https://anyid.chromiumapp.org/', undefined),
    ).not.toThrow();
  });
});
