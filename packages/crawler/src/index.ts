import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import * as cheerio from 'cheerio';
import { AppError } from '@prospectai/shared';

const allowedPorts = new Set(['', '80', '443']);
const metadataHosts = new Set([
  'metadata.google.internal',
  'metadata.goog',
  'instance-data.ec2.internal',
]);
const metadataAddresses = new Set(['169.254.169.254', '100.100.100.200']);
const maxRedirects = 5;
const defaultTimeoutMs = 15_000;
const defaultMaxBytes = 2_000_000;
const defaultMaxText = 120_000;

function isPrivateIpv4(address: string) {
  const octets = address.split('.').map(Number);
  if (
    octets.length !== 4 ||
    octets.some((value) => !Number.isInteger(value) || value < 0 || value > 255)
  )
    return true;
  const [a = 0, b = 0] = octets;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

function isPrivateIpv6(addressInput: string) {
  const address = addressInput.toLowerCase().split('%')[0] ?? '';
  if (address === '::' || address === '::1') return true;
  if (
    address.startsWith('fc') ||
    address.startsWith('fd') ||
    address.startsWith('fe8') ||
    address.startsWith('fe9') ||
    address.startsWith('fea') ||
    address.startsWith('feb')
  )
    return true;
  if (address.startsWith('ff')) return true;
  const mapped = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  return mapped ? isPrivateIpv4(mapped) : false;
}

export function isBlockedAddress(address: string) {
  if (metadataAddresses.has(address)) return true;
  const version = isIP(address);
  return version === 4 ? isPrivateIpv4(address) : version === 6 ? isPrivateIpv6(address) : true;
}

export function normalizePublicUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new AppError('INVALID_URL', 'A valid public HTTP or HTTPS URL is required.', 400);
  }
  const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
    throw new AppError(
      'UNSUPPORTED_URL',
      'Only public HTTP and HTTPS websites are supported.',
      400,
    );
  if (!allowedPorts.has(url.port))
    throw new AppError('UNSUPPORTED_URL', 'This network port is not supported.', 400);
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    metadataHosts.has(hostname)
  )
    throw new AppError('PRIVATE_NETWORK_BLOCKED', 'Private network targets are not allowed.', 400);
  if (
    hostname === 'linkedin.com' ||
    hostname.endsWith('.linkedin.com') ||
    hostname === 'www.linkedin.com'
  )
    throw new AppError('UNSUPPORTED_URL', 'LinkedIn pages are not supported in V1.', 400);
  if (isIP(hostname) && isBlockedAddress(hostname))
    throw new AppError('PRIVATE_NETWORK_BLOCKED', 'Private network targets are not allowed.', 400);
  url.hostname = hostname;
  url.hash = '';
  return url;
}

export type DnsResolver = (hostname: string) => Promise<Array<{ address: string; family: number }>>;

const defaultResolver: DnsResolver = (hostname) => lookup(hostname, { all: true, verbatim: true });

export async function validateNetworkTarget(
  url: URL,
  resolver: DnsResolver = defaultResolver,
): Promise<string[]> {
  let records: Array<{ address: string; family: number }>;
  try {
    records = await resolver(url.hostname);
  } catch {
    throw new AppError('WEBSITE_UNREACHABLE', 'The website hostname could not be resolved.', 422);
  }
  const addresses = records.map((record) => record.address);
  if (addresses.length === 0)
    throw new AppError('WEBSITE_UNREACHABLE', 'The website hostname could not be resolved.', 422);
  if (addresses.some(isBlockedAddress))
    throw new AppError(
      'PRIVATE_NETWORK_BLOCKED',
      'The website resolves to a private network.',
      400,
    );
  return addresses;
}

export interface ExtractedPage {
  url: string;
  title: string | null;
  description: string | null;
  headings: string[];
  links: string[];
  ctas: string[];
  forms: number;
  images: number;
  imagesWithoutAlt: number;
  language: string | null;
  hasViewport: boolean;
  openGraph: Record<string, string>;
  structuredData: unknown[];
  text: string;
  status: number;
  contentType: string;
  responseTimeMs: number;
}

export interface CrawlResult {
  finalUrl: string;
  title: string | null;
  text: string;
  contentType: string;
  page: ExtractedPage;
}

export interface Crawler {
  crawl(url: URL): Promise<CrawlResult>;
}

function cleanText(value: string, limit = 500) {
  return value.replace(/\s+/g, ' ').trim().slice(0, limit);
}

export function extractPage(
  html: string,
  url: URL,
  metadata: {
    status: number;
    contentType: string;
    responseTimeMs: number;
  },
): ExtractedPage {
  const $ = cheerio.load(html);
  const headings = $('h1, h2, h3')
    .map((_, element) => cleanText($(element).text(), 300))
    .get()
    .filter(Boolean)
    .slice(0, 50);
  const links = $('a[href]')
    .map((_, element) => {
      try {
        return new URL($(element).attr('href') ?? '', url).toString();
      } catch {
        return '';
      }
    })
    .get()
    .filter(Boolean)
    .slice(0, 200);
  const ctas = $('a, button, input[type="submit"]')
    .map((_, element) => cleanText($(element).text() || $(element).attr('value') || '', 100))
    .get()
    .filter((value) => /contact|book|start|get|buy|demo|quote|call|learn|sign up/i.test(value))
    .slice(0, 30);
  const openGraph: Record<string, string> = {};
  $('meta[property^="og:"]')
    .slice(0, 30)
    .each((_, element) => {
      const key = $(element).attr('property') ?? '';
      const value = cleanText($(element).attr('content') ?? '', 500);
      if (key && value) openGraph[key] = value;
    });
  const structuredData = $('script[type="application/ld+json"]')
    .map((_, element) => {
      try {
        return JSON.parse($(element).text()) as unknown;
      } catch {
        return null;
      }
    })
    .get()
    .filter((value) => value !== null)
    .slice(0, 10);
  $('script, style, noscript, template, svg').remove();
  const text = cleanText($('body').text(), defaultMaxText);
  return {
    url: url.toString(),
    title: cleanText($('title').first().text(), 300) || null,
    description: cleanText($('meta[name="description"]').attr('content') ?? '', 500) || null,
    headings,
    links,
    ctas,
    forms: $('form').length,
    images: $('img').length,
    imagesWithoutAlt: $('img:not([alt]), img[alt=""]').length,
    language: cleanText($('html').attr('lang') ?? '', 30) || null,
    hasViewport: $('meta[name="viewport"]').length > 0,
    openGraph,
    structuredData,
    text,
    ...metadata,
  };
}

async function boundedBody(response: Response, maxBytes: number) {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes)
    throw new AppError('WEBSITE_BLOCKED_CRAWLER', 'The website response is too large.', 422);
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    total += part.value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new AppError('WEBSITE_BLOCKED_CRAWLER', 'The website response is too large.', 422);
    }
    chunks.push(part.value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

export class HttpFirstCrawler implements Crawler {
  constructor(
    private readonly options: {
      fetcher?: typeof fetch;
      resolver?: DnsResolver;
      timeoutMs?: number;
      maxBytes?: number;
    } = {},
  ) {}

  async crawl(input: URL): Promise<CrawlResult> {
    const fetcher = this.options.fetcher ?? fetch;
    const resolver = this.options.resolver ?? defaultResolver;
    const timeoutMs = this.options.timeoutMs ?? defaultTimeoutMs;
    const maxBytes = this.options.maxBytes ?? defaultMaxBytes;
    let current = normalizePublicUrl(input.toString());

    for (let redirect = 0; redirect <= maxRedirects; redirect += 1) {
      await validateNetworkTarget(current, resolver);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const startedAt = performance.now();
      let response: Response;
      try {
        response = await fetcher(current, {
          redirect: 'manual',
          signal: controller.signal,
          headers: {
            Accept: 'text/html,application/xhtml+xml;q=0.9,text/plain;q=0.5',
            'User-Agent': 'ProspectAI/1.0 (+https://prospectai.local/crawler)',
          },
        });
      } catch (error) {
        if (controller.signal.aborted)
          throw new AppError('ANALYSIS_TIMEOUT', 'The website took too long to respond.', 504);
        throw new AppError('WEBSITE_UNREACHABLE', 'The website could not be reached.', 422, {
          cause: error instanceof Error ? error.name : 'network_error',
        });
      } finally {
        clearTimeout(timeout);
      }
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location)
          throw new AppError(
            'WEBSITE_UNREACHABLE',
            'The website returned an invalid redirect.',
            422,
          );
        if (redirect === maxRedirects)
          throw new AppError(
            'WEBSITE_BLOCKED_CRAWLER',
            'The website redirected too many times.',
            422,
          );
        current = normalizePublicUrl(new URL(location, current).toString());
        continue;
      }
      if (response.status === 401 || response.status === 403 || response.status === 429)
        throw new AppError(
          'WEBSITE_BLOCKED_CRAWLER',
          'The website blocked automated analysis.',
          422,
        );
      if (!response.ok)
        throw new AppError(
          'WEBSITE_UNREACHABLE',
          `The website returned HTTP ${response.status}.`,
          422,
        );
      const contentType = response.headers.get('content-type')?.split(';')[0]?.trim() ?? '';
      if (!['text/html', 'application/xhtml+xml', 'text/plain'].includes(contentType))
        throw new AppError(
          'UNSUPPORTED_URL',
          'The website did not return supported page content.',
          422,
        );
      const html = await boundedBody(response, maxBytes);
      const page = extractPage(html, current, {
        status: response.status,
        contentType,
        responseTimeMs: Math.round(performance.now() - startedAt),
      });
      return {
        finalUrl: current.toString(),
        title: page.title,
        text: page.text,
        contentType,
        page,
      };
    }
    throw new AppError('WEBSITE_BLOCKED_CRAWLER', 'The website redirected too many times.', 422);
  }
}
