import { PostgresAnalysisJobQueue } from '@prospectai/analysis';
import { apiError, parseJson, requestId } from '@prospectai/api';
import { normalizePublicUrl } from '@prospectai/crawler';
import { AppError } from '@prospectai/shared';
import { analysisRequestSchema } from '@prospectai/validation';
import {
  guestSessionSummary,
  guestUsageFeature,
  requireGuestSession,
} from '../../../../lib/guest-session';
import { enforceRateLimit } from '../../../../lib/rate-limit';

const queue = new PostgresAnalysisJobQueue();

export async function POST(request: Request) {
  const id = requestId(request.headers);
  try {
    const session = await requireGuestSession(request);
    await enforceRateLimit(request, 'guest.analysis', 10, 60_000, session.guestPublicId);
    const idempotencyKey = request.headers.get('idempotency-key');
    if (!idempotencyKey || idempotencyKey.length > 200)
      throw new AppError('VALIDATION_ERROR', 'Idempotency-Key is required.', 400);
    const input = await parseJson(request, analysisRequestSchema);
    const url = normalizePublicUrl(input.url);
    const job = await queue.reserveGuestAnalysisAndEnqueue({
      organizationId: session.organizationId,
      guestSessionId: session.id,
      canonicalUrl: url.toString(),
      domain: url.hostname.toLowerCase(),
      idempotencyKey,
      allowance: session.trialLimit,
      periodStart: session.createdAt,
      feature: guestUsageFeature,
    });
    return Response.json(
      {
        data: {
          jobId: job.id,
          analysisId: job.analysisId,
          status: 'queued',
          entitlement: await guestSessionSummary(session),
        },
      },
      { status: 202, headers: { 'Cache-Control': 'private, no-store', 'X-Request-Id': id } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
