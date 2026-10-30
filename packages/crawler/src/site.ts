import { AppError } from '@prospectai/shared';
import { HttpFirstCrawler, normalizePublicUrl, type CrawlResult, type Crawler } from './index';

export interface SiteCrawl {
  pages: CrawlResult[];
  discovered: number;
  skipped: Array<{ url: string; reason: string }>;
  limitations: string[];
}

// Sequential, depth-one discovery: every request still uses the pinned SSRF-safe transport.
export async function crawlSite(
  input: URL,
  options: { crawler?: Crawler; maxPages?: number; budgetMs?: number; delayMs?: number } = {},
): Promise<SiteCrawl> {
  const maxPages = Math.max(1, Math.min(6, options.maxPages ?? 4));
  const budgetMs = Math.max(1, Math.min(120_000, options.budgetMs ?? 60_000));
  const start = Date.now();
  const first = await (options.crawler ?? new HttpFirstCrawler()).crawl(input);
  const origin = new URL(first.finalUrl).origin;
  const crawler =
    options.crawler ?? new HttpFirstCrawler({ allowedOrigin: origin, timeoutMs: 5_000 });
  const candidates = new Set<string>();
  for (const link of first.page.links) {
    try {
      const url = normalizePublicUrl(link);
      if (
        url.origin !== origin ||
        url.search ||
        /\.(?:pdf|zip|png|jpe?g|svg|webp|mp4)$/i.test(url.pathname)
      )
        continue;
      if (
        /logout|signout|delete|remove|cart|checkout|login|signup|register|unsubscribe/i.test(
          url.pathname,
        )
      )
        continue;
      url.pathname = url.pathname.replace(/\/$/, '') || '/';
      if (
        url.href !== first.finalUrl.replace(/\/$/, '') &&
        url.pathname !== new URL(first.finalUrl).pathname
      )
        candidates.add(url.href);
    } catch {
      /* Non-public links are not crawl candidates. */
    }
  }
  const priority = (url: string) =>
    /about|services|products|pricing|contact|case-stud|team|faq|booking|locations/.test(
      new URL(url).pathname,
    )
      ? 0
      : 1;
  const ordered = [...candidates].sort((a, b) => priority(a) - priority(b) || a.localeCompare(b));
  const result: SiteCrawl = {
    pages: [first],
    discovered: ordered.length + 1,
    skipped: [],
    limitations: [
      'HTTP-only public content; no browser rendering, visual contrast, private backend access or exhaustive link validation.',
      'Depth one, sequential crawling, at most 4 pages by default; query URLs, actions, external domains and non-HTML assets are excluded.',
    ],
  };
  for (const url of ordered) {
    if (result.pages.length >= maxPages || Date.now() - start >= budgetMs) {
      result.skipped.push({ url, reason: 'crawl_limit' });
      continue;
    }
    await new Promise((resolve) => setTimeout(resolve, options.delayMs ?? 250));
    try {
      const page = await crawler.crawl(new URL(url));
      if (new URL(page.finalUrl).origin !== origin) {
        result.skipped.push({ url, reason: 'external_redirect' });
        continue;
      }
      if (result.pages.some((existing) => existing.finalUrl === page.finalUrl)) {
        result.skipped.push({ url, reason: 'duplicate_redirect' });
        continue;
      }
      result.pages.push(page);
    } catch (error) {
      result.skipped.push({
        url,
        reason: error instanceof AppError ? error.code : 'WEBSITE_UNREACHABLE',
      });
    }
  }
  if (result.skipped.length)
    result.limitations.push(
      'Some discovered pages were skipped or unavailable; findings are limited to retrieved pages.',
    );
  return result;
}
