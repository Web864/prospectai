import { randomUUID } from 'node:crypto';
import { hashPassword, hashSecret, newOpaqueToken, verifyPassword } from '@prospectai/auth';
import {
  loadAuthEnvironment,
  loadPublicEnvironment,
  loadServerEnvironment,
} from '@prospectai/config';
import { prisma } from '@prospectai/database';
import { AppError } from '@prospectai/shared';
import { sendTransactionalEmail } from './email';

const sessionCookieName = 'prospectai_session';
const sessionTtlMs = 7 * 24 * 60 * 60 * 1_000;
const actionTtlMs = {
  EMAIL_VERIFICATION: 24 * 60 * 60 * 1_000,
  PASSWORD_RESET: 60 * 60 * 1_000,
} as const;

export function readSessionToken(request: Request) {
  const prefix = `${sessionCookieName}=`;
  return request.headers
    .get('cookie')
    ?.split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith(prefix))
    ?.slice(prefix.length);
}

export function sessionCookie(token: string, expiresAt: Date) {
  const secure = loadServerEnvironment().NODE_ENV === 'production' ? '; Secure' : '';
  return `${sessionCookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Expires=${expiresAt.toUTCString()}${secure}`;
}

export function expiredSessionCookie() {
  return `${sessionCookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export async function createWebSession(userId: string, organizationId: string) {
  const token = newOpaqueToken();
  const expiresAt = new Date(Date.now() + sessionTtlMs);
  const environment = loadAuthEnvironment();
  await prisma.authSession.create({
    data: {
      userId,
      activeOrganizationId: organizationId,
      tokenHash: hashSecret(token, environment.SESSION_SECRET),
      expiresAt,
    },
  });
  return { token, expiresAt };
}

export async function revokeWebSession(token: string | undefined) {
  if (!token) return;
  const environment = loadAuthEnvironment();
  await prisma.authSession.updateMany({
    where: {
      tokenHash: hashSecret(token, environment.SESSION_SECRET),
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });
}

export async function issueAuthAction(
  userId: string,
  kind: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET',
) {
  const token = newOpaqueToken();
  const environment = loadAuthEnvironment();
  await prisma.$transaction([
    prisma.authActionToken.deleteMany({ where: { userId, kind, usedAt: null } }),
    prisma.authActionToken.create({
      data: {
        userId,
        kind,
        tokenHash: hashSecret(token, environment.SESSION_SECRET),
        expiresAt: new Date(Date.now() + actionTtlMs[kind]),
      },
    }),
  ]);
  return token;
}

export async function consumeAuthAction(
  token: string,
  kind: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET',
) {
  const environment = loadAuthEnvironment();
  return prisma.$transaction(async (transaction) => {
    const record = await transaction.authActionToken.findUnique({
      where: { tokenHash: hashSecret(token, environment.SESSION_SECRET) },
    });
    if (!record || record.kind !== kind || record.usedAt || record.expiresAt <= new Date())
      throw new AppError('AUTH_EXPIRED', 'This account action link is invalid or expired.', 401);
    await transaction.authActionToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });
    return record;
  });
}

function accountLink(path: string, token: string) {
  const appUrl = loadPublicEnvironment().NEXT_PUBLIC_APP_URL;
  const url = new URL(path, appUrl);
  url.searchParams.set('token', token);
  return url.toString();
}

export async function sendVerification(userId: string, email: string) {
  const token = await issueAuthAction(userId, 'EMAIL_VERIFICATION');
  return sendTransactionalEmail({
    to: email,
    subject: 'Verify your ProspectAI email',
    text: `Verify your ProspectAI email: ${accountLink('/verify-email', token)}`,
  });
}

export async function sendPasswordReset(userId: string, email: string) {
  const token = await issueAuthAction(userId, 'PASSWORD_RESET');
  return sendTransactionalEmail({
    to: email,
    subject: 'Reset your ProspectAI password',
    text: `Reset your ProspectAI password: ${accountLink('/reset-password', token)}`,
  });
}

export async function registerAccount(emailInput: string, password: string) {
  const email = emailInput.trim().toLowerCase();
  const passwordHash = await hashPassword(password);
  try {
    return await prisma.$transaction(async (transaction) => {
      const user = await transaction.user.create({
        data: { email, passwordHash, profile: { create: {} } },
      });
      const organization = await transaction.organization.create({
        data: {
          name: email.split('@')[0] || 'ProspectAI workspace',
          slug: `workspace-${randomUUID()}`,
        },
      });
      await transaction.membership.create({
        data: { userId: user.id, organizationId: organization.id, role: 'OWNER' },
      });
      return { user, organization };
    });
  } catch (error) {
    if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002')
      throw new AppError('CONFLICT', 'An account with this email already exists.', 409);
    throw error;
  }
}

export async function findOrCreateGoogleAccount(emailInput: string) {
  const email = emailInput.trim().toLowerCase();
  return prisma.$transaction(async (transaction) => {
    let user = await transaction.user.findUnique({
      where: { email },
      include: { memberships: { orderBy: { createdAt: 'asc' }, take: 1 } },
    });
    if (!user) {
      user = await transaction.user.create({
        data: { email, emailVerifiedAt: new Date(), profile: { create: {} } },
        include: { memberships: { orderBy: { createdAt: 'asc' }, take: 1 } },
      });
    } else if (!user.emailVerifiedAt) {
      user = await transaction.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: new Date() },
        include: { memberships: { orderBy: { createdAt: 'asc' }, take: 1 } },
      });
    }
    let membership = user.memberships[0];
    if (!membership) {
      const organization = await transaction.organization.create({
        data: {
          name: email.split('@')[0] || 'ProspectAI workspace',
          slug: 'workspace-' + randomUUID(),
        },
      });
      membership = await transaction.membership.create({
        data: { userId: user.id, organizationId: organization.id, role: 'OWNER' },
      });
    }
    return { user, organizationId: membership.organizationId };
  });
}
export async function authenticateAccount(emailInput: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email: emailInput.trim().toLowerCase() },
    include: { memberships: { orderBy: { createdAt: 'asc' }, take: 1 } },
  });
  if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash)))
    throw new AppError('UNAUTHENTICATED', 'The email or password was not accepted.', 401);
  const membership = user.memberships[0];
  if (!membership)
    throw new AppError('FORBIDDEN', 'This account does not belong to a workspace.', 403);
  return { user, organizationId: membership.organizationId };
}
