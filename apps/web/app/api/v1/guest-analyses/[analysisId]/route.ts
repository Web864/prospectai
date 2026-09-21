import { apiError, requestId } from '@prospectai/api';
import { prisma } from '@prospectai/database';
import { AppError } from '@prospectai/shared';
import type { AnalysisJobStatus } from '@prospectai/types';
import { requireGuestSession } from '../../../../../lib/guest-session';

const statusMap: Record<string, AnalysisJobStatus> = {
  QUEUED: 'queued',
  VALIDATING: 'validating',
  FETCHING: 'fetching',
  RENDERING: 'rendering',
  EXTRACTING: 'extracting',
  RULE_ANALYSIS: 'rule_analysis',
  AI_PROCESSING: 'ai_processing',
  OPPORTUNITY_SCORING: 'opportunity_scoring',
  COMPLETED: 'completed',
  PARTIAL: 'partial',
  FAILED: 'failed',
  CANCELED: 'cancelled',
  RETRY_PENDING: 'retry_pending',
  RETRYING: 'retrying',
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ analysisId: string }> },
) {
  const id = requestId(request.headers);
  try {
    const session = await requireGuestSession(request);
    const { analysisId } = await params;
    const analysis = await prisma.websiteAnalysis.findFirst({
      where: { id: analysisId, guestSessionId: session.id },
      include: {
        website: { select: { domain: true } },
        findings: { select: { title: true }, orderBy: { commercialRelevance: 'desc' }, take: 5 },
        opportunities: {
          select: {
            opportunityScore: true,
            summary: true,
            pitchAngle: true,
            serviceCategory: true,
          },
          orderBy: { opportunityScore: 'desc' },
          take: 1,
        },
      },
    });
    if (!analysis) throw new AppError('NOT_FOUND', 'Guest analysis not found.', 404);
    const opportunity = analysis.opportunities[0];
    return Response.json(
      {
        data: {
          id: analysis.id,
          companyName: analysis.website.domain,
          domain: analysis.website.domain,
          opportunityScore: opportunity?.opportunityScore ?? null,
          reasoning: opportunity?.summary ?? analysis.businessSummary,
          keySignals: analysis.findings.map((finding) => finding.title),
          recommendedNextAction:
            opportunity?.pitchAngle ??
            (opportunity ? `Explore a ${opportunity.serviceCategory} conversation.` : null),
          status: statusMap[analysis.status],
        },
      },
      { headers: { 'Cache-Control': 'private, no-store', 'X-Request-Id': id } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
