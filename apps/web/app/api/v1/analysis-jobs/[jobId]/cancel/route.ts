import { PostgresAnalysisJobQueue } from '@prospectai/analysis';
import { apiError, requestId } from '@prospectai/api';
import { requireRequestActor } from '../../../../../../lib/request-actor';

const queue = new PostgresAnalysisJobQueue();

export async function POST(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const id = requestId(request.headers);
  try {
    const actor = await requireRequestActor(request);
    const { jobId } = await params;
    const data = await queue.cancel(actor.organizationId, jobId);
    return Response.json({ data }, { headers: { 'X-Request-Id': id } });
  } catch (error) {
    return apiError(error, id);
  }
}
