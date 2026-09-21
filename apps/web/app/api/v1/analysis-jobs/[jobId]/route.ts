import { PostgresAnalysisJobQueue } from '@prospectai/analysis';
import { apiError, requestId } from '@prospectai/api';
import { AppError } from '@prospectai/shared';
import { requireGuestSession } from '../../../../../lib/guest-session';
import { requireRequestActor } from '../../../../../lib/request-actor';

const queue = new PostgresAnalysisJobQueue();

export async function GET(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const id = requestId(request.headers);
  try {
    const authorization = request.headers.get('authorization');
    const organizationId = authorization?.startsWith('Guest ')
      ? (await requireGuestSession(request)).organizationId
      : (await requireRequestActor(request)).organizationId;
    const { jobId } = await params;
    const job = await queue.getProgress(organizationId, jobId);
    if (!job) throw new AppError('NOT_FOUND', 'Analysis job not found.', 404);
    return Response.json(
      { data: job },
      {
        headers: {
          'Cache-Control': 'private, no-store',
          'X-Request-Id': id,
        },
      },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
