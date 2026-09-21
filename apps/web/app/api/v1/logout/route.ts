import { apiError, requestId } from '@prospectai/api';
import {
  expiredSessionCookie,
  readSessionToken,
  revokeWebSession,
} from '../../../../lib/auth-service';

export async function POST(request: Request) {
  const id = requestId(request.headers);
  try {
    await revokeWebSession(readSessionToken(request));
    return Response.json(
      { data: { message: 'Signed out.' } },
      { headers: { 'Set-Cookie': expiredSessionCookie(), 'X-Request-Id': id } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
