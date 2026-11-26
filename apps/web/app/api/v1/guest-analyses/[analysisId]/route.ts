import { apiError, requestId } from '@prospectai/api';
import { prisma } from '@prospectai/database';
import { unreadablePageText } from '@prospectai/crawler';
import { AppError, analysisLimitations, auditCoverage } from '@prospectai/shared';
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
      where: { id: analysisId, guestSessionId: session.id, organizationId: session.organizationId },
      include: {
        website: { select: { domain: true } },
        // One finding is stored per page, so read more than five and keep five distinct titles.
        findings: { select: { title: true }, orderBy: { commercialRelevance: 'desc' }, take: 25 },
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
    if (unreadablePageText(analysis.extractedText ?? ''))
      throw new AppError(
        'ANALYSIS_UNAVAILABLE',
        'Stored page content is unreadable. Re-analyze this website.',
        409,
      );
    const opportunity = analysis.opportunities[0];
    return Response.json(
      {
        data: {
          id: analysis.id,
          companyName: analysis.website.domain,
          domain: analysis.website.domain,
          // The analysis-level score, so guests see the same number as the registered result
          // and the full report. The top service's own score is not the analysis score.
          opportunityScore: analysis.opportunityScore ?? opportunity?.opportunityScore ?? null,
          reasoning: opportunity?.summary ?? analysis.businessSummary,
          keySignals: [...new Set(analysis.findings.map((finding) => finding.title))].slice(0, 5),
          aiStatus: analysis.aiStatus,
          limitations: [
            ...analysisLimitations(analysis.status, analysis.aiStatus),
            ...(auditCoverage(analysis.auditSnapshot)?.limitations ?? []),
          ],
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
