import { describe, expect, it } from 'vitest';
import { normalizePublicUrl } from '../src/index.js';

describe('normalizePublicUrl', () => {
  it('accepts a public HTTPS URL and strips fragments', () =>
    expect(normalizePublicUrl('https://example.com/path#x').toString()).toBe(
      'https://example.com/path',
    ));
  it.each(['http://localhost', 'http://127.0.0.1', 'http://192.168.1.1', 'file:///tmp/a'])(
    'rejects unsafe URL %s',
    (url) => expect(() => normalizePublicUrl(url)).toThrow(),
  );
});
