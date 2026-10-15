import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { prisma } from '../../packages/database/src/index.ts';
import { unreadablePageText } from '../../packages/crawler/src/index.ts';
import { createRequire } from 'node:module';
const { generateAnalysisPdf, persistedPdfReport, reportFilename } = createRequire(import.meta.url)(
  '../../apps/web/lib/analysis-pdf.ts',
) as typeof import('../../apps/web/lib/analysis-pdf.ts');

// Administrative read-only renderer check, not a substitute for authenticated API verification.
const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
process.chdir(fileURLToPath(new URL('../../apps/web/', import.meta.url)));
try {
  const candidates = await prisma.websiteAnalysis.findMany({
    where: { status: 'PARTIAL' },
    orderBy: { completedAt: 'desc' },
    take: 20,
    include: {
      website: true,
      findings: { orderBy: [{ commercialRelevance: 'desc' }, { createdAt: 'asc' }] },
      opportunities: { orderBy: { opportunityScore: 'desc' } },
    },
  });
  const analysis = candidates.find(
    (candidate) => !unreadablePageText(candidate.extractedText ?? ''),
  );
  if (!analysis) throw new Error('No persisted partial report exists.');
  const bytes = await generateAnalysisPdf(persistedPdfReport(analysis));
  const output = `${projectRoot}test-results/${reportFilename(analysis.website.domain)}`;
  await mkdir(`${projectRoot}test-results`, { recursive: true });
  await writeFile(output, bytes);
  console.log(
    JSON.stringify({
      analysisId: analysis.id,
      domain: analysis.website.domain,
      status: analysis.status,
      bytes: bytes.length,
      output,
      pdfHeader: Buffer.from(bytes).subarray(0, 5).toString(),
      authenticatedApiExport: 'NOT_TESTED_BY_THIS_SCRIPT',
    }),
  );
} finally {
  await prisma.$disconnect();
}
