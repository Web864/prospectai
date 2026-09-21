import { apiError, requestId } from '@prospectai/api';
import { prisma } from '@prospectai/database';
import { AppError } from '@prospectai/shared';
import { requireRequestActor } from '../../../../lib/request-actor';

export async function GET(request: Request) {
  const id = requestId(request.headers);
  try {
    const actor = await requireRequestActor(request);
    const [user, organization, session] = await Promise.all([
      prisma.user.findUnique({ where: { id: actor.userId }, include: { profile: true } }),
      prisma.organization.findUnique({ where: { id: actor.organizationId } }),
      actor.source === 'web'
        ? prisma.authSession.findFirst({
            where: {
              userId: actor.userId,
              activeOrganizationId: actor.organizationId,
              revokedAt: null,
            },
            orderBy: { createdAt: 'desc' },
          })
        : null,
    ]);
    if (!user || !organization) throw new AppError('UNAUTHENTICATED', 'Session is invalid.', 401);
    return Response.json(
      {
        data: {
          userId: user.id,
          email: user.email,
          displayName: user.profile?.displayName ?? null,
          organizationName: organization.name,
          role: actor.role,
          expiresAt: (session?.expiresAt ?? new Date(Date.now() + 60_000)).toISOString(),
        },
      },
      { headers: { 'Cache-Control': 'private, no-store', 'X-Request-Id': id } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
