import { AppError } from '@prospectai/shared';

const prohibitedHost =
  /(^localhost$)|(^127\.)|(^0\.)|(^169\.254\.)|(^10\.)|(^192\.168\.)|(^172\.(1[6-9]|2\d|3[01])\.)|(^\[?::1\]?$)|(^fc)|(^fd)|(^fe80)/i;
const allowedPorts = new Set(['', '80', '443']);

export function normalizePublicUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new AppError('VALIDATION_ERROR', 'A valid public HTTP or HTTPS URL is required.', 400);
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    prohibitedHost.test(url.hostname) ||
    !allowedPorts.has(url.port)
  ) {
    throw new AppError('VALIDATION_ERROR', 'This URL is not eligible for analysis.', 400);
  }
  url.hash = '';
  return url;
}

export interface CrawlResult {
  finalUrl: string;
  title: string | null;
  text: string;
  contentType: string;
}
export interface Crawler {
  crawl(url: URL): Promise<CrawlResult>;
}

export class HttpFirstCrawler implements Crawler {
  async crawl(): Promise<CrawlResult> {
    throw new AppError(
      'ANALYSIS_UNAVAILABLE',
      'Crawler execution is not enabled until the network-isolated worker adapter is configured.',
      503,
    );
  }
}
