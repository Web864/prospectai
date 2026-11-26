import { pathToFileURL } from 'node:url';
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
  // Rate-limit windows and spent account-action tokens have no value after expiry; without
  // pruning, both tables grow with every request for the lifetime of the deployment.
  const rateLimitBucketsDeleted = await prisma.rateLimitBucket.deleteMany({
    where: { expiresAt: { lt: now } },
  });
  const authActionTokensDeleted = await prisma.authActionToken.deleteMany({
    where: { OR: [{ expiresAt: { lt: now } }, { usedAt: { not: null } }] },
  });
  const result = {
    guestSessionsExpired: expiredSessions.count,
    rawGuestContentPurged: rawContentPurged.count,
    handoffsExpired: expiredHandoffs.count,
    rateLimitBucketsDeleted: rateLimitBucketsDeleted.count,
    authActionTokensDeleted: authActionTokensDeleted.count,
  };
  logger.info('maintenance_completed', result);
  return result;
}

const invokedDirectly =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]!).href;

// `pnpm --filter @prospectai/worker maintenance` runs one pass; the worker also runs it on a timer.
if (process.env.NODE_ENV !== 'test' && invokedDirectly)
  runMaintenance()
    .catch((error: unknown) => {
      logger.error('maintenance_failed', {
        error: error instanceof Error ? error.message : 'Unknown maintenance failure',
      });
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
