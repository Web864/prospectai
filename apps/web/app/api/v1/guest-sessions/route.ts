import { apiError, requestId } from '@prospectai/api';
import {
  establishGuestSession,
  guestSessionSummary,
  requireGuestSession,
} from '../../../../lib/guest-session';
import { enforceRateLimit } from '../../../../lib/rate-limit';

export async function POST(request: Request) {
  const id = requestId(request.headers);
  try {
    await enforceRateLimit(request, 'guest.session.create', 20, 24 * 60 * 60_000);
    const data = await establishGuestSession(request);
    return Response.json(
      { data },
      { status: 201, headers: { 'Cache-Control': 'private, no-store', 'X-Request-Id': id } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}

export async function GET(request: Request) {
  const id = requestId(request.headers);
  try {
    const session = await requireGuestSession(request);
    return Response.json(
      { data: await guestSessionSummary(session) },
      { headers: { 'Cache-Control': 'private, no-store', 'X-Request-Id': id } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
