import { prisma } from '@prospectai/database';
import { createLogger } from '@prospectai/shared';

const logger = createLogger('maintenance-worker');

export async function runMaintenance(now = new Date()) {
  const expiredSessions = await prisma.guestSession.updateMany({
    where: { status: 'ACTIVE', expiresAt: { lt: now } },
    data: { status: 'EXPIRED' },
  });
  const rawContentPurged = await prisma.websiteAnalysis.updateMany({
    where: {
      guestSession: { status: { in: ['EXPIRED', 'REVOKED'] } },
      rawContentExpiresAt: { lt: now },
      extractedText: { not: null },
    },
    data: { extractedText: null },
  });
  const expiredHandoffs = await prisma.extensionAuthorizationRequest.updateMany({
    where: { status: { in: ['PENDING', 'APPROVED'] }, expiresAt: { lt: now } },
    data: { status: 'EXPIRED', authorizationCodeHash: null },
  });
  const result = {
    guestSessionsExpired: expiredSessions.count,
    rawGuestContentPurged: rawContentPurged.count,
    handoffsExpired: expiredHandoffs.count,
  };
  logger.info('maintenance_completed', result);
  return result;
}

if (process.env.NODE_ENV !== 'test')
  runMaintenance()
    .catch((error: unknown) => {
      logger.error('maintenance_failed', {
        error: error instanceof Error ? error.message : 'Unknown maintenance failure',
      });
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
