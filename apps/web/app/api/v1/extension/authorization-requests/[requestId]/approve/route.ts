import { newOpaqueToken, hashSecret } from '@prospectai/auth';
import { apiError, requestId as responseRequestId } from '@prospectai/api';
import { loadAuthEnvironment } from '@prospectai/config';
import { prisma } from '@prospectai/database';
import { AppError } from '@prospectai/shared';
import { writeAudit } from '../../../../../../../lib/audit';
import { requireRequestActor } from '../../../../../../../lib/request-actor';

export async function POST(request: Request, context: { params: Promise<{ requestId: string }> }) {
  const id = responseRequestId(request.headers);
  try {
    const actor = await requireRequestActor(request);
    const { requestId } = await context.params;
    const code = newOpaqueToken();
    const environment = loadAuthEnvironment();
    const authorization = await prisma.extensionAuthorizationRequest.findUnique({
      where: { publicId: requestId },
    });
    if (!authorization || authorization.status !== 'PENDING')
      throw new AppError('AUTH_HANDOFF_INVALID', 'Authorization request is not active.', 409);
    if (authorization.expiresAt <= new Date()) {
      await prisma.extensionAuthorizationRequest.update({
        where: { id: authorization.id },
        data: { status: 'EXPIRED' },
      });
      throw new AppError('AUTH_HANDOFF_EXPIRED', 'Authorization request expired.', 401);
    }
    await prisma.extensionAuthorizationRequest.update({
      where: { id: authorization.id },
      data: {
        status: 'APPROVED',
        userId: actor.userId,
        organizationId: actor.organizationId,
        authorizationCodeHash: hashSecret(code, environment.EXTENSION_TOKEN_PEPPER),
        approvedAt: new Date(),
      },
    });
    const callback = new URL(authorization.redirectUri);
    callback.searchParams.set('code', code);
    callback.searchParams.set('state', authorization.publicId);
    await writeAudit({
      action: 'extension.authorization.approved',
      resourceType: 'ExtensionAuthorizationRequest',
      resourceId: authorization.publicId,
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
    });
    return Response.json(
      {
        data: {
          message: 'Extension authorized. Returning to ProspectAI.',
          next: callback.toString(),
        },
      },
      { headers: { 'Cache-Control': 'no-store', 'X-Request-Id': id } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
