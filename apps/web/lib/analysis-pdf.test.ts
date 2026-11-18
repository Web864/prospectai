// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { generateAnalysisPdf, reportFilename, type AnalysisPdfReport } from './analysis-pdf';

const report: AnalysisPdfReport = {
  domain: 'real-prospect.test',
  url: 'https://real-prospect.test/',
  analyzedAt: new Date('2026-10-15T00:00:00Z'),
  status: 'PARTIAL',
  websiteScore: 62,
  opportunityScore: 81,
  confidence: 0.8,
  summary: 'Résumé of a public business.',
  limitations: ['AI analysis was unavailable.'],
  findings: [],
  opportunities: [],
};
describe('persisted analysis PDF rendering', () => {
  it.each(['COMPLETED', 'PARTIAL'] as const)(
    'creates a readable %s document from real-shaped structured data',
    async (status) => {
      const bytes = await generateAnalysisPdf({ ...report, status });
      expect(Buffer.from(bytes).subarray(0, 5).toString()).toBe('%PDF-');
      const pdf = await PDFDocument.load(bytes);
      expect(pdf.getTitle()).toBe('ProspectAI - real-prospect.test');
      expect(pdf.getPageCount()).toBeGreaterThan(0);
      expect(pdf.getAuthor()).toBe('ProspectAI');
    },
  );
  it('paginates long findings and unbroken URLs with missing optional fields', async () => {
    const bytes = await generateAnalysisPdf({
      ...report,
      analyzedAt: null,
      summary: null,
      confidence: null,
      findings: Array.from({ length: 20 }, () => ({
        title: 'Long finding',
        category: 'SEO',
        description: null,
        evidence: 'Observed evidence. '.repeat(100),
        sourceUrl: 'https://real-prospect.test/' + 'a'.repeat(500),
      })),
    });
    expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(5);
  });
  it('sanitizes filenames and rejects excessive reports without silent truncation', async () => {
    expect(reportFilename('../../bad\r\n"name')).not.toMatch(/[\r\n"/\\]/);
    await expect(
      generateAnalysisPdf({ ...report, summary: 'x'.repeat(500_001) }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });
});

describe('complete report content', () => {
  const rich: AnalysisPdfReport = {
    ...report,
    status: 'COMPLETED',
    scoringVersion: 'website-v2',
    coverage: { discovered: 5, analyzed: 3, skipped: 2, limitations: [] } as never,
    componentScores: [
      { name: 'SEO', weight: 0.2, score: 55, findingCount: 2 },
      { name: 'Technical', weight: 0.2, score: 90, findingCount: 0 },
    ],
    pages: [
      {
        url: 'https://real-prospect.test/',
        title: 'Home',
        status: 200,
        responseTimeMs: 420,
        responseBytes: 1000,
        canonical: null,
        robots: null,
        h1Count: 0,
        headingSkips: 1,
        missingAlt: 3,
        unlabeledInputs: 0,
        unnamedButtons: 0,
        emptyLinks: 0,
        hasMain: true,
        placeholderText: false,
        ctaCount: 1,
        emails: ['hello@real-prospect.test'],
        phones: ['+1 555 0100'],
        securityHeaders: { 'x-frame-options': 'DENY' },
      },
    ],
    findings: [
      {
        category: 'SEO',
        title: 'Missing H1',
        severity: 'HIGH',
        confidence: 0.9,
        description: 'Search engines lack a page topic.',
        evidence: 'No h1 on home page.',
        sourceUrl: 'https://real-prospect.test/',
        recommendation: 'Add one H1.',
      },
    ],
    opportunities: [
      {
        title: 'SEO fix',
        serviceCategory: 'SEO',
        commercialReason: 'Traffic loss.',
        pitchAngle: 'Lead with H1.',
        opportunityScore: 70,
        confidence: 0.8,
        summary: 'Summary text',
        strength: 'medium',
      },
    ],
    pitches: [{ format: 'EMAIL', content: 'Hello there' }],
  };
  it('renders every section and notes characters the font cannot draw', async () => {
    const bytes = await generateAnalysisPdf({
      ...rich,
      summary: 'Urdu سلام 😀 and Привет',
    });
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(2);
    const plain = await generateAnalysisPdf(rich);
    expect(plain.length).toBeGreaterThan(5000);
  });
  it('does not fail on empty optional sections', async () => {
    await expect(
      generateAnalysisPdf({ ...rich, pages: [], pitches: [], componentScores: [] }),
    ).resolves.toBeInstanceOf(Uint8Array);
  });
});
