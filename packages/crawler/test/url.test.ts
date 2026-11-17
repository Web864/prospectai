import { describe, expect, it } from 'vitest';
import { normalizePublicUrl, isBlockedAddress, validateNetworkTarget } from '../src/index.js';

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

describe('SSRF address classification', () => {
  it.each([
    // Equivalent spellings of loopback must not bypass the check.
    '0:0:0:0:0:0:0:1',
    '0000:0000:0000:0000:0000:0000:0000:0001',
    '::0001',
    '::FFFF:7F00:1',
    '0:0:0:0:0:ffff:127.0.0.1',
    '::127.0.0.1',
    '::7f00:1',
    // Embedded private IPv4 behind transition mechanisms.
    '2002:7f00:1::',
    '2002:a9fe:a9fe::',
    '::ffff:169.254.169.254',
    // Reserved IPv6 ranges.
    'fec0::1',
    'fd12:3456::1',
    'FE80::1%eth0',
    'ff02::1',
    '2001:0:4136:e378:8000:63bf:3fff:fdd2',
    '2001:db8::1',
    '64:ff9b::7f00:1',
    // Non-routable IPv4 special-purpose blocks.
    '192.88.99.1',
    '198.51.100.7',
    '203.0.113.9',
    // Garbage is never treated as public.
    'not-an-ip',
  ])('blocks %s', (address) => expect(isBlockedAddress(address)).toBe(true));

  it.each(['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111', '2001:4860:4860::8888', '2002:808:808::'])(
    'allows public address %s',
    (address) => expect(isBlockedAddress(address)).toBe(false),
  );
});

describe('IPv6 literal URLs', () => {
  it.each([
    'http://[::1]/',
    'http://[::ffff:127.0.0.1]/',
    'http://[::ffff:a9fe:a9fe]/',
    'http://[fe80::1]/',
    'http://[fc00::1]/',
    'http://[0:0:0:0:0:0:0:1]/',
  ])('rejects %s explicitly as a private target', (url) =>
    expect(() => normalizePublicUrl(url)).toThrowError(
      expect.objectContaining({ code: 'PRIVATE_NETWORK_BLOCKED' }),
    ),
  );

  it('accepts a public IPv6 literal and resolves it without brackets', async () => {
    const url = normalizePublicUrl('http://[2606:4700:4700::1111]/');
    const seen: string[] = [];
    const addresses = await validateNetworkTarget(url, async (hostname) => {
      seen.push(hostname);
      return [{ address: hostname, family: 6 }];
    });
    expect(seen).toEqual(['2606:4700:4700::1111']);
    expect(addresses).toEqual(['2606:4700:4700::1111']);
  });
});
