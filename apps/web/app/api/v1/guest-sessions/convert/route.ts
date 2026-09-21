import { apiError, parseJson, requestId } from '@prospectai/api';
import { AppError } from '@prospectai/shared';
import { guestConversionRequestSchema } from '@prospectai/validation';
import { writeAudit } from '../../../../../lib/audit';
import { convertGuestSession } from '../../../../../lib/guest-session';
import { enforceRateLimit } from '../../../../../lib/rate-limit';
import { requireRequestActor } from '../../../../../lib/request-actor';

export async function POST(request: Request) {
  const id = requestId(request.headers);
  try {
    const actor = await requireRequestActor(request);
    await enforceRateLimit(request, 'guest.convert', 10, 15 * 60_000, actor.userId);
    const guestToken = request.headers.get('x-guest-token');
    if (!guestToken)
      throw new AppError('GUEST_SESSION_INVALID', 'Guest conversion token is required.', 401);
    const input = await parseJson(request, guestConversionRequestSchema);
    const result = await convertGuestSession({
      guestToken,
      guestPublicId: input.guestSessionId,
      userId: actor.userId,
      organizationId: actor.organizationId,
    });
    await writeAudit({
      action: 'guest.converted',
      resourceType: 'GuestSession',
      resourceId: input.guestSessionId,
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
    });
    return Response.json(
      { data: result },
      { headers: { 'Cache-Control': 'private, no-store', 'X-Request-Id': id } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
