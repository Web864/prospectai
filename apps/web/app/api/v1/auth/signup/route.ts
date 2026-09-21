import { apiError, parseJson, requestId } from '@prospectai/api';
import { authCredentialsSchema } from '@prospectai/validation';
import {
  registerAccount,
  createWebSession,
  sendVerification,
  sessionCookie,
} from '../../../../../lib/auth-service';
import { writeAudit } from '../../../../../lib/audit';
import { enforceRateLimit } from '../../../../../lib/rate-limit';

export async function POST(request: Request) {
  const id = requestId(request.headers);
  try {
    await enforceRateLimit(request, 'auth.signup', 5, 15 * 60_000);
    const input = await parseJson(request, authCredentialsSchema);
    const { user, organization } = await registerAccount(input.email, input.password);
    const session = await createWebSession(user.id, organization.id);
    const email = await sendVerification(user.id, user.email);
    await writeAudit({
      action: 'auth.signup',
      resourceType: 'User',
      resourceId: user.id,
      organizationId: organization.id,
      actorUserId: user.id,
      metadata: { emailAdapter: email.adapter, delivered: email.delivered },
    });
    return Response.json(
      {
        data: {
          message: email.delivered
            ? 'Account created. Check your email to verify your address.'
            : 'Account created. Development email delivery is disabled.',
          next: '/onboarding',
        },
      },
      {
        status: 201,
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
