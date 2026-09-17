import { hashSecret, requireActor, type SessionResolver } from '@prospectai/auth';
import { loadAuthEnvironment } from '@prospectai/config';
import { prisma } from '@prospectai/database';
import type { ActorContext, MembershipRole } from '@prospectai/types';

const membershipRole: Record<'OWNER' | 'ADMIN' | 'MEMBER', MembershipRole> = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
};

async function actorForMembership(
  userId: string,
  organizationId: string,
  source: ActorContext['source'],
): Promise<ActorContext | null> {
  const membership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
    select: { role: true },
  });
  return membership
    ? { userId, organizationId, role: membershipRole[membership.role], source }
    : null;
}

function createSessionResolver(): SessionResolver {
  const environment = loadAuthEnvironment();
  return {
    async resolveExtensionToken(token) {
      const session = await prisma.extensionSession.findUnique({
        where: { tokenHash: hashSecret(token, environment.EXTENSION_TOKEN_PEPPER) },
        select: {
          userId: true,
          organizationId: true,
          status: true,
          expiresAt: true,
          revokedAt: true,
        },
      });
      if (
        !session ||
        session.status !== 'CONNECTED' ||
        session.revokedAt ||
        session.expiresAt <= new Date()
      )
        return null;
      return actorForMembership(session.userId, session.organizationId, 'extension');
    },
    async resolveWebSession(token) {
      const session = await prisma.authSession.findUnique({
        where: { tokenHash: hashSecret(token, environment.SESSION_SECRET) },
        select: {
          userId: true,
          activeOrganizationId: true,
          expiresAt: true,
          revokedAt: true,
        },
      });
      if (!session?.activeOrganizationId || session.revokedAt || session.expiresAt <= new Date())
        return null;
      return actorForMembership(session.userId, session.activeOrganizationId, 'web');
    },
  };
}

function cookieValue(header: string | null, name: string) {
  const prefix = `${name}=`;
  return header
    ?.split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith(prefix))
    ?.slice(prefix.length);
}

export function requireRequestActor(request: Request) {
  return requireActor(
    createSessionResolver(),
    request.headers.get('authorization'),
    cookieValue(request.headers.get('cookie'), 'prospectai_session'),
  );
}
