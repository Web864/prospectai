import { hashSecret, newOpaqueToken, verifyPkce } from '@prospectai/auth';
import { apiError, parseJson, requestId as responseRequestId } from '@prospectai/api';
import { loadAuthEnvironment } from '@prospectai/config';
import { prisma } from '@prospectai/database';
import { AppError } from '@prospectai/shared';
import { extensionAuthorizationExchangeSchema } from '@prospectai/validation';
import { enforceRateLimit } from '../../../../../../../lib/rate-limit';

export async function POST(request: Request, context: { params: Promise<{ requestId: string }> }) {
  const id = responseRequestId(request.headers);
  try {
    await enforceRateLimit(request, 'extension.authorization.exchange', 20, 15 * 60_000);
    const input = await parseJson(request, extensionAuthorizationExchangeSchema);
    const { requestId } = await context.params;
    const environment = loadAuthEnvironment();
    const accessToken = newOpaqueToken();
    const refreshToken = newOpaqueToken();
    const expiresAt = new Date(Date.now() + 60 * 60_000);
    await prisma.$transaction(async (transaction) => {
      const authorization = await transaction.extensionAuthorizationRequest.findUnique({
        where: { publicId: requestId },
      });
      if (
        !authorization ||
        authorization.status !== 'APPROVED' ||
        !authorization.userId ||
        !authorization.organizationId ||
        !authorization.authorizationCodeHash
      )
        throw new AppError('AUTH_HANDOFF_INVALID', 'Authorization handoff is invalid.', 401);
      if (authorization.expiresAt <= new Date()) {
        await transaction.extensionAuthorizationRequest.update({
          where: { id: authorization.id },
          data: { status: 'EXPIRED' },
        });
        throw new AppError('AUTH_HANDOFF_EXPIRED', 'Authorization handoff expired.', 401);
      }
      if (
        hashSecret(input.code, environment.EXTENSION_TOKEN_PEPPER) !==
          authorization.authorizationCodeHash ||
        !verifyPkce(input.codeVerifier, authorization.codeChallenge)
      )
        throw new AppError('AUTH_HANDOFF_INVALID', 'Authorization proof is invalid.', 401);
      const consumed = await transaction.extensionAuthorizationRequest.updateMany({
        where: { id: authorization.id, status: 'APPROVED', completedAt: null },
        data: { status: 'COMPLETED', completedAt: new Date(), authorizationCodeHash: null },
      });
      if (consumed.count !== 1)
        throw new AppError('AUTH_HANDOFF_INVALID', 'Authorization code was already used.', 409);
      await transaction.extensionSession.create({
        data: {
          userId: authorization.userId,
          organizationId: authorization.organizationId,
          authorizationRequestId: authorization.publicId,
          codeChallenge: authorization.codeChallenge,
          ...(authorization.deviceName ? { deviceName: authorization.deviceName } : {}),
          extensionVersion: authorization.extensionVersion,
          tokenHash: hashSecret(accessToken, environment.EXTENSION_TOKEN_PEPPER),
          refreshTokenHash: hashSecret(refreshToken, environment.EXTENSION_TOKEN_PEPPER),
          status: 'CONNECTED',
          expiresAt,
          lastActiveAt: new Date(),
        },
      });
    });
    return Response.json(
      { data: { accessToken, refreshToken, expiresAt: expiresAt.toISOString() } },
      { headers: { 'Cache-Control': 'no-store', 'X-Request-Id': id } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
