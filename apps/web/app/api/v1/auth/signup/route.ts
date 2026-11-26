import { apiError, parseJson, requestId } from '@prospectai/api';
import { AppError, createLogger } from '@prospectai/shared';
import { authCredentialsSchema } from '@prospectai/validation';
import {
  registerAccount,
  createWebSession,
  sendVerification,
  sessionCookie,
} from '../../../../../lib/auth-service';
import { writeAudit } from '../../../../../lib/audit';
import { enforceRateLimit } from '../../../../../lib/rate-limit';

const logger = createLogger('auth');

export async function POST(request: Request) {
  const id = requestId(request.headers);
  try {
    await enforceRateLimit(request, 'auth.signup', 5, 15 * 60_000);
    const input = await parseJson(request, authCredentialsSchema);
    const { user, organization } = await registerAccount(input.email, input.password);
    const session = await createWebSession(user.id, organization.id);
    // The account already exists at this point. An email outage must not turn signup into an
    // error, or the user is left with an account they cannot sign in to from this response.
    const email = await sendVerification(user.id, user.email).catch((error: unknown) => {
      logger.error('signup_verification_email_failed', {
        requestId: id,
        error: error instanceof AppError ? error.code : 'unknown',
      });
      return { delivered: false, adapter: 'failed' as const };
    });
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
            : email.adapter === 'failed'
              ? 'Account created. The verification email could not be sent yet.'
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
