import { hashSecret } from '@prospectai/auth';
import { apiError, requestId } from '@prospectai/api';
import { loadAuthEnvironment } from '@prospectai/config';
import { prisma } from '@prospectai/database';
import { AppError } from '@prospectai/shared';
import { requireRequestActor } from '../../../../../lib/request-actor';

function bearer(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) throw new AppError('UNAUTHENTICATED', 'Extension token is required.', 401);
  return token;
}

export async function GET(request: Request) {
  const id = requestId(request.headers);
  try {
    const environment = loadAuthEnvironment();
    const session = await prisma.extensionSession.findUnique({
      where: { tokenHash: hashSecret(bearer(request), environment.EXTENSION_TOKEN_PEPPER) },
    });
    if (
      !session ||
      session.status !== 'CONNECTED' ||
      session.revokedAt ||
      session.expiresAt <= new Date()
    )
      throw new AppError('SESSION_REVOKED', 'Extension session is not active.', 401);
    return Response.json(
      {
        data: {
          status: 'connected',
          extensionVersion: session.extensionVersion,
          lastActiveAt: session.lastActiveAt?.toISOString() ?? null,
        },
      },
      { headers: { 'Cache-Control': 'no-store', 'X-Request-Id': id } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}

export async function DELETE(request: Request) {
  const id = requestId(request.headers);
  try {
    const authorization = request.headers.get('authorization');
    const updated = authorization?.startsWith('Bearer ')
      ? await prisma.extensionSession.updateMany({
          where: {
            tokenHash: hashSecret(bearer(request), loadAuthEnvironment().EXTENSION_TOKEN_PEPPER),
            revokedAt: null,
          },
          data: { status: 'DISCONNECTED', revokedAt: new Date() },
        })
      : await (async () => {
          const actor = await requireRequestActor(request);
          return prisma.extensionSession.updateMany({
            where: {
              userId: actor.userId,
              organizationId: actor.organizationId,
              revokedAt: null,
            },
            data: { status: 'DISCONNECTED', revokedAt: new Date() },
          });
        })();
    if (updated.count < 1)
      throw new AppError('SESSION_REVOKED', 'Extension session is not active.', 401);
    return Response.json(
      { data: { message: 'Extension disconnected.' } },
      { headers: { 'X-Request-Id': id } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
