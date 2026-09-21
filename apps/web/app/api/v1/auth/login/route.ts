import { apiError, parseJson, requestId } from '@prospectai/api';
import { authCredentialsSchema } from '@prospectai/validation';
import {
  authenticateAccount,
  createWebSession,
  sessionCookie,
} from '../../../../../lib/auth-service';
import { writeAudit } from '../../../../../lib/audit';
import { enforceRateLimit } from '../../../../../lib/rate-limit';

export async function POST(request: Request) {
  const id = requestId(request.headers);
  try {
    await enforceRateLimit(request, 'auth.login', 10, 15 * 60_000);
    const input = await parseJson(request, authCredentialsSchema);
    const { user, organizationId } = await authenticateAccount(input.email, input.password);
    const session = await createWebSession(user.id, organizationId);
    await writeAudit({
      action: 'auth.login',
      resourceType: 'AuthSession',
      organizationId,
      actorUserId: user.id,
    });
    return Response.json(
      { data: { message: 'Signed in successfully.', next: '/app' } },
      {
        headers: {
          'Set-Cookie': sessionCookie(session.token, session.expiresAt),
          'X-Request-Id': id,
        },
      },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
