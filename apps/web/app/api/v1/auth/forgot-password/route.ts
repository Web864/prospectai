import { apiError, parseJson, requestId } from '@prospectai/api';
import { prisma } from '@prospectai/database';
import { emailActionSchema } from '@prospectai/validation';
import { sendPasswordReset } from '../../../../../lib/auth-service';
import { enforceRateLimit } from '../../../../../lib/rate-limit';

export async function POST(request: Request) {
  const id = requestId(request.headers);
  try {
    await enforceRateLimit(request, 'auth.password-reset-request', 5, 60 * 60_000);
    const input = await parseJson(request, emailActionSchema);
    // Stops one address from being flooded with reset emails from many clients.
    await enforceRateLimit(
      request,
      'auth.password-reset-request.account',
      3,
      60 * 60_000,
      `account:${input.email.trim().toLowerCase()}`,
    );
    const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (user) await sendPasswordReset(user.id, user.email);
    return Response.json(
      { data: { message: 'If the account exists, password reset instructions are available.' } },
      { headers: { 'X-Request-Id': id } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
