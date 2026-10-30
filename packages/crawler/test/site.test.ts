import { describe, it, expect, vi } from 'vitest';
import { crawlSite, extractPage } from '../src/index';

const result = (url: string, html: string) => ({
  finalUrl: url,
  title: null,
  text: '',
  contentType: 'text/html',
  page: extractPage(html, new URL(url), {
    status: 200,
    contentType: 'text/html',
    responseTimeMs: 1,
  }),
});
describe('bounded public-site discovery', () => {
  it('deduplicates, prioritizes relevant pages and excludes actions/external/query targets', async () => {
    const crawl = vi.fn(async (url: URL) =>
      result(
        url.href,
        url.pathname === '/'
          ? '<a href="/about">About</a><a href="/about#x">Duplicate</a><a href="/contact">Contact</a><a href="/logout">Logout</a><a href="https://other.test/">Other</a><a href="/?action=delete">Action</a>'
          : '<h1>About</h1>',
      ),
    );
    const site = await crawlSite(new URL('https://public.test/'), {
      crawler: { crawl },
      maxPages: 2,
      delayMs: 0,
    });
    expect(crawl).toHaveBeenCalledTimes(2);
    expect(site.pages).toHaveLength(2);
    expect(site.discovered).toBe(3);
    expect(site.skipped).toHaveLength(1);
    expect(crawl.mock.calls[1]![0].pathname).toBe('/about');
  });
  it('retains the homepage when a secondary page fails', async () => {
    const crawl = vi
      .fn()
      .mockResolvedValueOnce(result('https://public.test/', '<a href="/about">About</a>'))
      .mockRejectedValueOnce(new Error('network'));
    const site = await crawlSite(new URL('https://public.test/'), {
      crawler: { crawl },
      delayMs: 0,
    });
    expect(site.pages).toHaveLength(1);
    expect(site.skipped[0]?.reason).toBe('WEBSITE_UNREACHABLE');
  });
  it('extracts supported accessibility and content signals without penalizing decorative alt', () => {
    const page = result(
      'https://public.test/',
      '<html><body><h1>Hello</h1><h3>Skip</h3><img alt=""><img><input><button></button><p>Lorem ipsum</p></body></html>',
    ).page;
    expect(page.audit).toMatchObject({
      missingAlt: 1,
      headingSkips: 1,
      unlabeledInputs: 1,
      unnamedButtons: 1,
      placeholderText: true,
    });
  });
});
