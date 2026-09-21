import { describe, expect, it, vi } from 'vitest';
import {
  HttpFirstCrawler,
  extractPage,
  isBlockedAddress,
  normalizePublicUrl,
  validateNetworkTarget,
} from '../src/index.js';

const publicResolver = async () => [{ address: '93.184.216.34', family: 4 }];

describe('crawler safety and extraction', () => {
  it('normalizes a public hostname without truncating it', () => {
    expect(normalizePublicUrl('https://Example.COM./path#section').toString()).toBe(
      'https://example.com/path',
    );
  });

  it.each([
    '127.0.0.1',
    '10.0.0.1',
    '100.64.0.1',
    '169.254.169.254',
    '192.168.1.2',
    '::1',
    'fd00::1',
    'fe80::1',
    '::ffff:127.0.0.1',
  ])('blocks private or reserved address %s', (address) => {
    expect(isBlockedAddress(address)).toBe(true);
  });

  it('rejects a hostname when any DNS result is private', async () => {
    await expect(
      validateNetworkTarget(new URL('https://example.com'), async () => [
        { address: '93.184.216.34', family: 4 },
        { address: '127.0.0.1', family: 4 },
      ]),
    ).rejects.toMatchObject({ code: 'PRIVATE_NETWORK_BLOCKED' });
  });

  it('revalidates and blocks redirects to private targets', async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/admin' } }),
    );
    const crawler = new HttpFirstCrawler({
      fetcher: fetcher as typeof fetch,
      resolver: publicResolver,
    });

    await expect(crawler.crawl(new URL('https://example.com'))).rejects.toMatchObject({
      code: 'PRIVATE_NETWORK_BLOCKED',
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('enforces declared response size limits', async () => {
    const fetcher = vi.fn(
      async () =>
        new Response('large', {
          status: 200,
          headers: { 'content-type': 'text/html', 'content-length': '100' },
        }),
    );
    const crawler = new HttpFirstCrawler({
      fetcher: fetcher as typeof fetch,
      resolver: publicResolver,
      maxBytes: 10,
    });

    await expect(crawler.crawl(new URL('https://example.com'))).rejects.toMatchObject({
      code: 'WEBSITE_BLOCKED_CRAWLER',
    });
  });

  it('times out a stalled request', async () => {
    const fetcher = vi.fn(
      (_url: URL | RequestInfo, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        }),
    );
    const crawler = new HttpFirstCrawler({
      fetcher: fetcher as typeof fetch,
      resolver: publicResolver,
      timeoutMs: 5,
    });

    await expect(crawler.crawl(new URL('https://example.com'))).rejects.toMatchObject({
      code: 'ANALYSIS_TIMEOUT',
    });
  });

  it('extracts bounded readable HTML and JSON-LD from malformed markup', () => {
    const page = extractPage(
      '<html lang="en"><head><title>  Example   Site </title><script type="application/ld+json">{"@type":"Organization"}</script></head><body><h1>Hello   world<img src="x"><a href="/contact">Contact us',
      new URL('https://example.com'),
      { status: 200, contentType: 'text/html', responseTimeMs: 12 },
    );

    expect(page.title).toBe('Example Site');
    expect(page.headings).toEqual(['Hello worldContact us']);
    expect(page.links).toContain('https://example.com/contact');
    expect(page.imagesWithoutAlt).toBe(1);
    expect(page.structuredData).toEqual([{ '@type': 'Organization' }]);
    expect(page.text).not.toContain('Organization');
  });
});
