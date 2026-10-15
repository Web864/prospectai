import { describe, expect, it, vi } from 'vitest';
import { Readable } from 'node:stream';
import { gzipSync, deflateSync, brotliCompressSync } from 'node:zlib';
import {
  HttpFirstCrawler,
  extractPage,
  isBlockedAddress,
  normalizePublicUrl,
  validateNetworkTarget,
  decodePinnedBody,
  unreadablePageText,
} from '../src/index.js';

const publicResolver = async () => [{ address: '93.184.216.34', family: 4 }];

describe('crawler safety and extraction', () => {
  it('enforces the decoded byte limit on a compressed response', async () => {
    const compressed = gzipSync(Buffer.from('<html><body>' + 'x'.repeat(4000) + '</body></html>'));
    const crawler = new HttpFirstCrawler({
      resolver: publicResolver,
      maxBytes: 1000,
      fetcher: async () =>
        new Response(
          Readable.toWeb(
            decodePinnedBody(Readable.from([compressed]), 'gzip', 1000),
          ) as ReadableStream,
          { headers: { 'content-type': 'text/html' } },
        ),
    });
    await expect(crawler.crawl(new URL('https://example.com'))).rejects.toMatchObject({
      code: 'WEBSITE_BLOCKED_CRAWLER',
    });
  });
  it('bounds DNS resolution independently of the HTTP request', async () => {
    await expect(
      validateNetworkTarget(new URL('https://example.com'), () => new Promise(() => undefined), 10),
    ).rejects.toMatchObject({ code: 'ANALYSIS_TIMEOUT' });
  });
  it.each([
    ['gzip', gzipSync],
    ['deflate', deflateSync],
    ['br', brotliCompressSync],
  ] as const)('decodes %s before extracting evidence', async (encoding, compress) => {
    const html =
      '<html lang="en"><head><title>Real title</title><meta name="description" content="Real description"></head><body>Actual readable evidence.</body></html>';
    const stream = decodePinnedBody(Readable.from([compress(Buffer.from(html))]), encoding);
    const decoded = await new Response(Readable.toWeb(stream) as ReadableStream).text();
    expect(decoded).toBe(html);
    expect(unreadablePageText(decoded)).toBe(false);
    expect(
      extractPage(decoded, new URL('https://example.com'), {
        status: 200,
        contentType: 'text/html',
        responseTimeMs: 1,
      }).title,
    ).toBe('Real title');
  });
  it('bounds compressed input and rejects binary text instead of creating findings', async () => {
    const stream = decodePinnedBody(Readable.from([Buffer.alloc(100)]), 'identity', 10);
    await expect(
      new Response(Readable.toWeb(stream) as ReadableStream).text(),
    ).rejects.toMatchObject({ code: 'WEBSITE_BLOCKED_CRAWLER' });
    expect(unreadablePageText('\u001f\uFFFD compressed bytes')).toBe(true);
    const crawler = new HttpFirstCrawler({
      resolver: publicResolver,
      fetcher: async () =>
        new Response('\u001f\uFFFD compressed bytes', { headers: { 'content-type': 'text/html' } }),
    });
    await expect(crawler.crawl(new URL('https://example.com'))).rejects.toMatchObject({
      code: 'WEBSITE_BLOCKED_CRAWLER',
    });
  });
  it.each([
    ['ENOTFOUND', false],
    ['EAI_AGAIN', true],
  ])(
    'classifies DNS %s without repeating permanent resolution failures',
    async (code, retryable) => {
      const resolver = async () => {
        throw Object.assign(new Error('DNS failure'), { code });
      };
      await expect(
        validateNetworkTarget(new URL('https://example.com'), resolver),
      ).rejects.toMatchObject({ details: { retryable } });
    },
  );
  it('keeps its timeout active while reading the response body', async () => {
    const crawler = new HttpFirstCrawler({
      resolver: publicResolver,
      timeoutMs: 10,
      fetcher: async (_input, init) =>
        new Response(
          new ReadableStream({
            start(controller) {
              init?.signal?.addEventListener(
                'abort',
                () => controller.error(new Error('Aborted body')),
                { once: true },
              );
            },
          }),
          { headers: { 'content-type': 'text/html' } },
        ),
    });
    await expect(crawler.crawl(new URL('https://example.com'))).rejects.toMatchObject({
      code: 'ANALYSIS_TIMEOUT',
    });
  });
  it.each([
    [404, false],
    [503, true],
  ])('classifies HTTP %i retryability', async (status, retryable) => {
    const crawler = new HttpFirstCrawler({
      resolver: publicResolver,
      fetcher: async () => new Response('', { status }),
    });
    await expect(crawler.crawl(new URL('https://example.com'))).rejects.toMatchObject({
      details: { retryable },
    });
  });
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

  it('consumes redirect bodies before following the next URL', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('redirect response', {
          status: 302,
          headers: { location: 'https://example.com/final' },
        }),
      )
      .mockResolvedValueOnce(
        new Response('<html><head><title>Final</title></head><body>Done</body></html>', {
          status: 200,
          headers: { 'content-type': 'text/html' },
        }),
      );
    const crawler = new HttpFirstCrawler({
      fetcher: fetcher as typeof fetch,
      resolver: publicResolver,
    });

    const result = await crawler.crawl(new URL('https://example.com'));
    expect(result.page.title).toBe('Final');
    expect(fetcher).toHaveBeenCalledTimes(2);
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
