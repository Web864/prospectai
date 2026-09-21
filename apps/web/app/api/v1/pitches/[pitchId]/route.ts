import { apiError, parseJson, requestId } from '@prospectai/api';
import { prisma } from '@prospectai/database';
import { AppError } from '@prospectai/shared';
import { pitchUpdateSchema } from '@prospectai/validation';
import { requireRequestActor } from '../../../../../lib/request-actor';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ pitchId: string }> },
) {
  const id = requestId(request.headers);
  try {
    const actor = await requireRequestActor(request);
    const { pitchId } = await params;
    const pitch = await prisma.pitch.findFirst({
      where: { id: pitchId, organizationId: actor.organizationId },
    });
    if (!pitch) throw new AppError('NOT_FOUND', 'Pitch not found.', 404);
    const input = await parseJson(request, pitchUpdateSchema);
    await prisma.pitch.update({ where: { id: pitch.id }, data: { content: input.content } });
    return Response.json(
      { data: { message: 'Pitch saved.' } },
      { headers: { 'X-Request-Id': id } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
