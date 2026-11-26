import { prisma } from '@prospectai/database';
import { createLogger } from '@prospectai/shared';

export const dynamic = 'force-dynamic';

const logger = createLogger('health');
/** A queued job older than this means no worker is claiming work. */
const queueStallSeconds = 300;

/**
 * Readiness for uptime monitors: checks the database and whether the analysis worker is
 * draining the queue. Returns 503 when either is unhealthy. Exposes no tenant data.
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const oldest = await prisma.analysisJob.findFirst({
      where: { status: 'QUEUED', nextAttemptAt: { lte: new Date() } },
      orderBy: { nextAttemptAt: 'asc' },
      select: { nextAttemptAt: true },
    });
    const oldestQueuedSeconds = oldest
      ? Math.max(0, Math.round((Date.now() - oldest.nextAttemptAt.getTime()) / 1_000))
      : 0;
    const queueHealthy = oldestQueuedSeconds < queueStallSeconds;
    return Response.json(
      {
        status: queueHealthy ? 'ok' : 'degraded',
        database: 'ok',
        queue: { healthy: queueHealthy, oldestQueuedSeconds },
      },
      { status: queueHealthy ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    logger.error('readiness_failed', { error: error instanceof Error ? error.name : 'unknown' });
    return Response.json(
      { status: 'unavailable', database: 'unreachable' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
