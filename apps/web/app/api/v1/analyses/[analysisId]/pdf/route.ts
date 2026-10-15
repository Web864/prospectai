import { apiError, requestId } from '@prospectai/api';
import { prisma } from '@prospectai/database';
import { AppError } from '@prospectai/shared';
import { requireRequestActor } from '../../../../../../lib/request-actor';
import { requireGuestSession } from '../../../../../../lib/guest-session';
import {
  generateAnalysisPdf,
  reportFilename,
  persistedPdfReport,
} from '../../../../../../lib/analysis-pdf';
import { enforceRateLimit } from '../../../../../../lib/rate-limit';

export const runtime = 'nodejs';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ analysisId: string }> },
) {
  const id = requestId(request.headers);
  try {
    const guest = /^Guest /i.test(request.headers.get('authorization') ?? '')
      ? await requireGuestSession(request)
      : null;
    const organizationId = guest
      ? guest.organizationId
      : (await requireRequestActor(request)).organizationId;
    const { analysisId } = await params;
    const analysis = await prisma.websiteAnalysis.findFirst({
      where: { id: analysisId, organizationId, ...(guest ? { guestSessionId: guest.id } : {}) },
      include: {
        website: true,
        findings: { orderBy: [{ commercialRelevance: 'desc' }, { createdAt: 'asc' }] },
        opportunities: { orderBy: { opportunityScore: 'desc' } },
      },
    });
    if (!analysis) throw new AppError('NOT_FOUND', 'Analysis not found.', 404);
    if (analysis.status !== 'COMPLETED' && analysis.status !== 'PARTIAL')
      throw new AppError('CONFLICT', 'A completed or partial report is required for export.', 409);
    await enforceRateLimit(request, 'analysis.pdf', 20, 60_000, organizationId);
    const pdf = await generateAnalysisPdf(persistedPdfReport(analysis));
    return new Response(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${reportFilename(analysis.website.domain)}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'X-Request-Id': id,
      },
    });
  } catch (error) {
    return apiError(error, id);
  }
}
