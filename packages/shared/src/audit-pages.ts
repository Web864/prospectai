export interface AuditPageSummary {
  url: string;
  title: string | null;
  status: number | null;
  responseTimeMs: number | null;
  responseBytes: number | null;
  canonical: string | null;
  robots: string | null;
  h1Count: number | null;
  headingSkips: number | null;
  missingAlt: number | null;
  unlabeledInputs: number | null;
  unnamedButtons: number | null;
  emptyLinks: number | null;
  hasMain: boolean | null;
  placeholderText: boolean | null;
  ctaCount: number | null;
  emails: string[];
  phones: string[];
  securityHeaders: Record<string, string>;
}

const maxPages = 200;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value : null);
const count = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
const flag = (value: unknown) => (typeof value === 'boolean' ? value : null);
const strings = (value: unknown, limit = 20) =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string').slice(0, limit)
    : [];

/**
 * Reads the per-page results stored in `WebsiteAnalysis.auditSnapshot`. The column is arbitrary JSON,
 * so every field is validated individually; malformed entries are skipped instead of failing a report.
 */
export function auditPages(snapshot: unknown): AuditPageSummary[] {
  const pages = record(snapshot)?.pages;
  if (!Array.isArray(pages)) return [];
  const result: AuditPageSummary[] = [];
  for (const entry of pages.slice(0, maxPages)) {
    const page = record(entry);
    const url = text(page?.url);
    if (!page || !url) continue;
    const audit = record(page.audit) ?? {};
    const headers = record(audit.securityHeaders) ?? {};
    result.push({
      url,
      title: text(page.title),
      status: count(page.status),
      responseTimeMs: count(page.responseTimeMs),
      responseBytes: count(audit.responseBytes),
      canonical: text(audit.canonical),
      robots: text(audit.robots),
      h1Count: count(audit.h1Count),
      headingSkips: count(audit.headingSkips),
      missingAlt: count(audit.missingAlt),
      unlabeledInputs: count(audit.unlabeledInputs),
      unnamedButtons: count(audit.unnamedButtons),
      emptyLinks: count(audit.emptyLinks),
      hasMain: flag(audit.hasMain),
      placeholderText: flag(audit.placeholderText),
      ctaCount: Array.isArray(audit.ctaDestinations) ? audit.ctaDestinations.length : null,
      emails: strings(audit.emails),
      phones: strings(audit.phones),
      securityHeaders: Object.fromEntries(
        Object.entries(headers).filter(
          (pair): pair is [string, string] => typeof pair[1] === 'string',
        ),
      ),
    });
  }
  return result;
}
