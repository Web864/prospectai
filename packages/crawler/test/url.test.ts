import { describe, expect, it } from 'vitest';
import { normalizePublicUrl, isBlockedAddress } from '../src/index.js';

describe('normalizePublicUrl', () => {
  it.each(['::ffff:7f00:1', '::ffff:a00:1', '::ffff:127.0.0.1', '198.18.0.1', '192.0.0.8'])(
    'blocks mapped/private special-purpose address %s',
    (address) => expect(isBlockedAddress(address)).toBe(true),
  );
  it('accepts a public HTTPS URL and strips fragments', () =>
    expect(normalizePublicUrl('https://example.com/path#x').toString()).toBe(
      'https://example.com/path',
    ));
  it.each(['http://localhost', 'http://127.0.0.1', 'http://192.168.1.1', 'file:///tmp/a'])(
    'rejects unsafe URL %s',
    (url) => expect(() => normalizePublicUrl(url)).toThrow(),
  );
});
