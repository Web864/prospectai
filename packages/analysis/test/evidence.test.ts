import { describe, expect, it } from 'vitest';
import type { ExtractedPage } from '@prospectai/crawler';
import { analyzePageEvidence, evidenceEngineVersion } from '../src/index.js';

const page = (overrides: Partial<ExtractedPage> = {}): ExtractedPage => ({
  url: 'http://example.com/',
  title: null,
  description: null,
  headings: [],
  links: [],
  ctas: [],
  forms: 0,
  images: 2,
  imagesWithoutAlt: 1,
  language: null,
  hasViewport: false,
  openGraph: {},
  structuredData: [],
  text: 'Example',
  status: 200,
  contentType: 'text/html',
  responseTimeMs: 9_000,
  ...overrides,
});

describe('deterministic evidence engine', () => {
  it('produces versioned, source-linked evidence for observable signals', () => {
    const findings = analyzePageEvidence(page());

    expect(findings.length).toBeGreaterThan(8);
    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'technical.insecure-http',
          sourceUrl: 'http://example.com/',
          evidence: expect.objectContaining({ engineVersion: evidenceEngineVersion }),
        }),
        expect.objectContaining({ code: 'performance.slow-response', severity: 5 }),
      ]),
    );
    expect(findings.every((finding) => finding.deterministicScore > 0)).toBe(true);
  });

  it('does not invent findings when corresponding evidence is present', () => {
    const findings = analyzePageEvidence(
      page({
        url: 'https://example.com/',
        title: 'Example',
        description: 'A useful description',
        headings: ['A clear heading'],
        links: ['https://example.com/contact'],
        ctas: ['Contact us'],
        forms: 1,
        imagesWithoutAlt: 0,
        language: 'en',
        hasViewport: true,
        openGraph: { 'og:title': 'Example' },
        responseTimeMs: 100,
      }),
    );

    expect(findings).toEqual([]);
  });
});
