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
