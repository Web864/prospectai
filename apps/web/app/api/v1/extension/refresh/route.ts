import { hashSecret, newOpaqueToken } from '@prospectai/auth';
import { apiError, parseJson, requestId } from '@prospectai/api';
import { loadAuthEnvironment } from '@prospectai/config';
import { prisma } from '@prospectai/database';
import { AppError } from '@prospectai/shared';
import { extensionRefreshSchema } from '@prospectai/validation';

export async function POST(request: Request) {
  const id = requestId(request.headers);
  try {
    const input = await parseJson(request, extensionRefreshSchema);
    const environment = loadAuthEnvironment();
    const session = await prisma.extensionSession.findUnique({
      where: {
        refreshTokenHash: hashSecret(input.refreshToken, environment.EXTENSION_TOKEN_PEPPER),
      },
    });
    if (
      !session ||
      session.status !== 'CONNECTED' ||
      session.revokedAt ||
      session.createdAt.getTime() + 30 * 24 * 60 * 60 * 1_000 <= Date.now()
    )
      throw new AppError('SESSION_REVOKED', 'Extension session is not active.', 401);
    const accessToken = newOpaqueToken();
    const refreshToken = newOpaqueToken();
    const expiresAt = new Date(Date.now() + 60 * 60_000);
    await prisma.extensionSession.update({
      where: { id: session.id },
      data: {
        tokenHash: hashSecret(accessToken, environment.EXTENSION_TOKEN_PEPPER),
        refreshTokenHash: hashSecret(refreshToken, environment.EXTENSION_TOKEN_PEPPER),
        expiresAt,
        lastActiveAt: new Date(),
      },
    });
    return Response.json(
      { data: { accessToken, refreshToken, expiresAt: expiresAt.toISOString() } },
      { headers: { 'Cache-Control': 'no-store', 'X-Request-Id': id } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
