import { apiError, parseJson, requestId } from '@prospectai/api';
import { hashPassword } from '@prospectai/auth';
import { prisma } from '@prospectai/database';
import { resetPasswordSchema } from '@prospectai/validation';
import { consumeAuthAction } from '../../../../../lib/auth-service';
import { enforceRateLimit } from '../../../../../lib/rate-limit';

export async function POST(request: Request) {
  const id = requestId(request.headers);
  try {
    await enforceRateLimit(request, 'auth.password-reset', 10, 60 * 60_000);
    const input = await parseJson(request, resetPasswordSchema);
    const action = await consumeAuthAction(input.token, 'PASSWORD_RESET');
    const passwordHash = await hashPassword(input.password);
    await prisma.$transaction([
      prisma.user.update({ where: { id: action.userId }, data: { passwordHash } }),
      prisma.authSession.updateMany({
        where: { userId: action.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      prisma.extensionSession.updateMany({
        where: { userId: action.userId, revokedAt: null },
        data: { status: 'REVOKED', revokedAt: new Date() },
      }),
    ]);
    return Response.json(
      { data: { message: 'Password reset. Sign in with your new password.', next: '/login' } },
      { headers: { 'X-Request-Id': id } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
