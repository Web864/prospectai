import { PostgresAnalysisJobQueue } from '@prospectai/analysis';
import { apiError, parseJson, requestId } from '@prospectai/api';
import { normalizePublicUrl } from '@prospectai/crawler';
import { prisma } from '@prospectai/database';
import { AppError } from '@prospectai/shared';
import { analysisRequestSchema } from '@prospectai/validation';
import { organizationEntitlement } from '../../../../lib/entitlements';
import { enforceRateLimit } from '../../../../lib/rate-limit';
import { requireRequestActor } from '../../../../lib/request-actor';

const queue = new PostgresAnalysisJobQueue();
const statusMap = {
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
} as const;

export async function POST(request: Request) {
  const id = requestId(request.headers);
  try {
    const actor = await requireRequestActor(request);
    await enforceRateLimit(request, 'analysis.create', 5, 60_000, actor.organizationId);
    const idempotencyKey = request.headers.get('idempotency-key');
    if (!idempotencyKey || idempotencyKey.length > 200)
      throw new AppError('VALIDATION_ERROR', 'Idempotency-Key is required.', 400);
    const input = await parseJson(request, analysisRequestSchema);
    const url = normalizePublicUrl(input.url);
    const entitlement = await organizationEntitlement(actor.organizationId);
    const job = await queue.reserveAnalysisAndEnqueue({
      organizationId: actor.organizationId,
      canonicalUrl: url.toString(),
      domain: url.hostname,
      idempotencyKey,
      allowance: entitlement.limit,
      periodStart: entitlement.periodStart,
    });
    return Response.json(
      { data: { jobId: job.id, analysisId: job.analysisId, status: 'queued' } },
      { status: 202, headers: { 'Cache-Control': 'no-store', 'X-Request-Id': id } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}

export async function GET(request: Request) {
  const id = requestId(request.headers);
  try {
    const actor = await requireRequestActor(request);
    const analyses = await prisma.websiteAnalysis.findMany({
      where: { organizationId: actor.organizationId },
      include: { website: { select: { domain: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return Response.json(
      {
        data: analyses.map((analysis) => ({
          id: analysis.id,
          domain: analysis.website.domain,
          status: statusMap[analysis.status],
          websiteScore: analysis.websiteScore,
          opportunityScore: analysis.opportunityScore,
          createdAt: analysis.createdAt.toISOString(),
        })),
      },
      { headers: { 'Cache-Control': 'private, no-store', 'X-Request-Id': id } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
