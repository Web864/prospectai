import { apiError, requestId } from '@prospectai/api';
import { prisma } from '@prospectai/database';
import { AppError } from '@prospectai/shared';
import type { AnalysisJobStatus } from '@prospectai/types';
import { requireRequestActor } from '../../../../../lib/request-actor';

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

function evidenceText(value: unknown) {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'observation' in value)
    return String((value as { observation: unknown }).observation);
  return 'Evidence recorded.';
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ analysisId: string }> },
) {
  const id = requestId(request.headers);
  try {
    const actor = await requireRequestActor(request);
    const { analysisId } = await params;
    const analysis = await prisma.websiteAnalysis.findFirst({
      where: { id: analysisId, organizationId: actor.organizationId },
      include: {
        website: true,
        findings: { orderBy: [{ commercialRelevance: 'desc' }, { createdAt: 'asc' }] },
        opportunities: { orderBy: { opportunityScore: 'desc' } },
        pitches: { orderBy: { updatedAt: 'desc' } },
      },
    });
    if (!analysis) throw new AppError('NOT_FOUND', 'Analysis not found.', 404);
    return Response.json(
      {
        data: {
          id: analysis.id,
          status: statusMap[analysis.status],
          domain: analysis.website.domain,
          companyName: analysis.website.domain,
          analyzedAt: analysis.completedAt?.toISOString() ?? null,
          websiteScore: analysis.websiteScore,
          opportunityScore: analysis.opportunityScore,
          confidence: analysis.confidence,
          businessSummary: analysis.businessSummary,
          findings: analysis.findings.map((finding) => ({
            id: finding.id,
            category: finding.category,
            title: finding.title,
            evidence: evidenceText(finding.evidence),
            interpretation: finding.description,
          })),
          opportunities: analysis.opportunities.map((opportunity) => ({
            id: opportunity.id,
            title: opportunity.title,
            serviceCategory: opportunity.serviceCategory,
            summary: opportunity.summary,
            opportunityScore: opportunity.opportunityScore,
            confidence: opportunity.confidence,
            commercialReason: opportunity.commercialReason,
            pitchAngle: opportunity.pitchAngle,
          })),
          pitches: analysis.pitches.map((pitch) => ({
            id: pitch.id,
            format: pitch.format,
            content: pitch.content,
          })),
        },
      },
      { headers: { 'Cache-Control': 'private, no-store', 'X-Request-Id': id } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
