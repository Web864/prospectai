import { randomUUID } from 'node:crypto';
import { calculateReservedUsage } from '@prospectai/analysis';
import { hashSecret } from '@prospectai/auth';
import { loadGuestEnvironment } from '@prospectai/config';
import { prisma } from '@prospectai/database';
import { AppError } from '@prospectai/shared';
import type { GuestSessionStatus, GuestSessionSummary } from '@prospectai/types';
import { guestSessionAccessError } from './guest-session-policy';

export const guestUsageFeature = 'guest_analysis';

const statusMap = {
  ACTIVE: 'active',
  CONVERTED: 'converted',
  EXPIRED: 'expired',
  REVOKED: 'revoked',
} as const satisfies Record<string, GuestSessionStatus>;

function tokenFromHeader(value: string | null, scheme: 'Guest' | 'Bearer' = 'Guest') {
  const token = value?.match(new RegExp(`^${scheme} ([A-Za-z0-9_-]{43,128})$`, 'i'))?.[1];
  if (!token)
    throw new AppError('GUEST_SESSION_INVALID', 'A valid guest session is required.', 401);
  return token;
}

export function guestTokenFromRequest(request: Request) {
  return tokenFromHeader(request.headers.get('authorization'));
}

async function usageFor(organizationId: string, createdAt: Date) {
  const grouped = await prisma.usageLedger.groupBy({
    by: ['operation'],
    where: {
      organizationId,
      feature: guestUsageFeature,
      createdAt: { gte: createdAt },
    },
    _sum: { quantity: true },
  });
  return Math.max(
    0,
    calculateReservedUsage(
      grouped.map((entry) => ({
        operation: entry.operation,
        quantity: entry._sum.quantity ?? 0,
      })),
    ),
  );
}

type GuestRecord = Awaited<ReturnType<typeof findGuestByToken>>;

async function findGuestByToken(token: string) {
  const environment = loadGuestEnvironment();
  return prisma.guestSession.findUnique({
    where: { tokenHash: hashSecret(token, environment.GUEST_SESSION_PEPPER) },
  });
}

async function assertActiveGuest(session: NonNullable<GuestRecord>) {
  const accessError = guestSessionAccessError(statusMap[session.status], session.expiresAt);
  if (accessError === 'GUEST_SESSION_EXPIRED' && session.status === 'ACTIVE') {
    await prisma.guestSession.update({
      where: { id: session.id },
      data: { status: 'EXPIRED' },
    });
  }
  if (accessError === 'GUEST_SESSION_EXPIRED')
    throw new AppError(accessError, 'The guest session has expired.', 401);
  if (accessError === 'GUEST_SESSION_INVALID')
    throw new AppError(accessError, 'The guest session is not active.', 401);
  return session;
}

export async function guestSessionSummary(
  session: NonNullable<GuestRecord>,
): Promise<GuestSessionSummary> {
  const trialUsed = await usageFor(session.organizationId, session.createdAt);
  const trialRemaining = Math.max(0, session.trialLimit - trialUsed);
  return {
    sessionId: session.guestPublicId,
    mode: 'guest',
    status: statusMap[session.status],
    trialLimit: session.trialLimit,
    trialUsed,
    trialRemaining,
    quotaReached: trialRemaining === 0,
    expiresAt: session.expiresAt.toISOString(),
  };
}

export async function establishGuestSession(request: Request) {
  const token = guestTokenFromRequest(request);
  const environment = loadGuestEnvironment();
  const tokenHash = hashSecret(token, environment.GUEST_SESSION_PEPPER);
  const existing = await prisma.guestSession.findUnique({ where: { tokenHash } });
  if (existing) return guestSessionSummary(await assertActiveGuest(existing));

  const guestPublicId = randomUUID();
  const expiresAt = new Date(
    Date.now() + environment.GUEST_SESSION_TTL_DAYS * 24 * 60 * 60 * 1_000,
  );
  try {
    const session = await prisma.$transaction(async (transaction) => {
      const organization = await transaction.organization.create({
        data: { name: 'Guest workspace', slug: `guest-${guestPublicId}` },
      });
      return transaction.guestSession.create({
        data: {
          guestPublicId,
          tokenHash,
          organizationId: organization.id,
          trialLimit: environment.GUEST_ANALYSIS_LIMIT,
          expiresAt,
        },
      });
    });
    return guestSessionSummary(session);
  } catch (error) {
    const session = await prisma.guestSession.findUnique({ where: { tokenHash } });
    if (session) return guestSessionSummary(await assertActiveGuest(session));
    throw error;
  }
}

export async function requireGuestSession(request: Request) {
  const session = await findGuestByToken(guestTokenFromRequest(request));
  if (!session) throw new AppError('GUEST_SESSION_INVALID', 'The guest session is invalid.', 401);
  return assertActiveGuest(session);
}

export async function requireGuestToken(token: string) {
  const session = await findGuestByToken(token);
  if (!session) throw new AppError('GUEST_SESSION_INVALID', 'The guest session is invalid.', 401);
  return assertActiveGuest(session);
}

export async function convertGuestSession(input: {
  guestToken: string;
  guestPublicId: string;
  userId: string;
  organizationId: string;
}) {
  const guest = await findGuestByToken(input.guestToken);
  if (!guest) throw new AppError('GUEST_SESSION_INVALID', 'The guest session is invalid.', 401);
  if (guest.guestPublicId !== input.guestPublicId)
    throw new AppError('GUEST_CONVERSION_FAILED', 'Guest conversion could not be verified.', 409);

  return prisma.$transaction(async (transaction) => {
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`guest-convert:${guest.id}`}, 0))`;
    const current = await transaction.guestSession.findUnique({ where: { id: guest.id } });
    if (!current) throw new AppError('GUEST_SESSION_INVALID', 'The guest session is invalid.', 401);
    if (current.status === 'CONVERTED') {
      if (current.convertedUserId !== input.userId)
        throw new AppError('GUEST_CONVERSION_FAILED', 'Guest session is already converted.', 409);
      const preserved = await transaction.websiteAnalysis.findFirst({
        where: { guestSessionId: current.id, organizationId: input.organizationId },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });
      return {
        converted: true,
        alreadyConverted: true,
        ...(preserved ? { preservedAnalysisId: preserved.id } : {}),
      };
    }
    if (current.status !== 'ACTIVE' || current.expiresAt <= new Date())
      throw new AppError('GUEST_CONVERSION_FAILED', 'Guest session cannot be converted.', 409);

    const analyses = await transaction.websiteAnalysis.findMany({
      where: { guestSessionId: current.id },
      include: { website: { select: { canonicalUrl: true, domain: true } } },
      orderBy: { createdAt: 'desc' },
    });
    for (const analysis of analyses) {
      const website = await transaction.website.upsert({
        where: {
          organizationId_domain: {
            organizationId: input.organizationId,
            domain: analysis.website.domain,
          },
        },
        create: {
          organizationId: input.organizationId,
          canonicalUrl: analysis.website.canonicalUrl,
          domain: analysis.website.domain,
        },
        update: { canonicalUrl: analysis.website.canonicalUrl },
      });
      await transaction.websiteAnalysis.update({
        where: { id: analysis.id },
        data: { organizationId: input.organizationId, websiteId: website.id },
      });
      await transaction.analysisJob.updateMany({
        where: { analysisId: analysis.id, guestSessionId: current.id },
        data: { organizationId: input.organizationId },
      });
    }
    await transaction.guestSession.update({
      where: { id: current.id },
      data: {
        status: 'CONVERTED',
        convertedUserId: input.userId,
        convertedAt: new Date(),
      },
    });
    return {
      converted: true,
      alreadyConverted: false,
      ...(analyses[0] ? { preservedAnalysisId: analyses[0].id } : {}),
    };
  });
}
