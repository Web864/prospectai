import { execFileSync } from 'node:child_process';
import { deepStrictEqual } from 'node:assert';
import { fileURLToPath } from 'node:url';
import { prisma } from '../../packages/database/src/index.ts';

// Read-only comparison of real Chrome results and their persisted guest projection.
const [popupTarget, ...analysisIds] = process.argv.slice(2);
if (!popupTarget || !analysisIds.length) throw new Error('Provide popup target and analysis IDs.');
const probe = fileURLToPath(new URL('./chrome-probe.mjs', import.meta.url));
try {
  for (const id of analysisIds) {
    const expression = `(async()=>{
      const stored=await chrome.storage.local.get('guestToken');
      const response=await fetch('http://localhost:3000/api/v1/guest-analyses/'+${JSON.stringify(id)}, {
        headers:{Authorization:'Guest '+stored.guestToken}, signal:AbortSignal.timeout(20000)
      });
      return {status:response.status,data:(await response.json()).data};
    })()`;
    const message = JSON.parse(
      execFileSync(process.execPath, [probe, 'eval', popupTarget, expression], {
        encoding: 'utf8',
      }),
    );
    if (message.error || message.result?.exceptionDetails)
      throw new Error('Chrome result request failed.');
    const api = message.result.result.value;
    if (api.status !== 200) throw new Error(`Result HTTP status ${api.status}`);
    const analysis = await prisma.websiteAnalysis.findUniqueOrThrow({
      where: { id },
      include: {
        website: true,
        findings: { orderBy: { commercialRelevance: 'desc' }, take: 5 },
        opportunities: { orderBy: { opportunityScore: 'desc' }, take: 1 },
      },
    });
    const opportunity = analysis.opportunities[0];
    deepStrictEqual(api.data, {
      id,
      companyName: analysis.website.domain,
      domain: analysis.website.domain,
      opportunityScore: opportunity?.opportunityScore ?? null,
      reasoning: opportunity?.summary ?? analysis.businessSummary,
      keySignals: analysis.findings.map((finding) => finding.title),
      recommendedNextAction:
        opportunity?.pitchAngle ??
        (opportunity ? `Explore a ${opportunity.serviceCategory} conversation.` : null),
      status: analysis.status.toLowerCase(),
    });
    const jobs = await prisma.analysisJob.findMany({
      where: { analysisId: id },
      select: { id: true, attempt: true, status: true, lockedAt: true, lockedBy: true },
    });
    if (jobs.length !== 1 || jobs[0]?.lockedAt || jobs[0]?.lockedBy)
      throw new Error('Unexpected duplicate job or retained lease.');
    console.log(JSON.stringify({ analysisId: id, exactDatabaseApiMatch: true, jobs }));
  }
} finally {
  await prisma.$disconnect();
}
