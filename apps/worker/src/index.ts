import { hostname } from 'node:os';
import { PostgresAnalysisJobQueue, type ClaimedAnalysisJob } from '@prospectai/analysis';
import { loadWorkerEnvironment } from '@prospectai/config';
import { AppError, createLogger } from '@prospectai/shared';

const logger = createLogger('analysis-worker');

function wait(milliseconds: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (signal.aborted) return resolve();
    const timer = setTimeout(resolve, milliseconds);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

function leaseFor(job: ClaimedAnalysisJob) {
  return { id: job.id, lockedBy: job.lockedBy, attempt: job.attempt };
}

async function processJob(
  queue: PostgresAnalysisJobQueue,
  job: ClaimedAnalysisJob,
  heartbeatIntervalMs: number,
) {
  const lease = leaseFor(job);
  const heartbeat = setInterval(() => {
    void queue.heartbeat(lease).catch((error: unknown) =>
      logger.error('job_heartbeat_failed', {
        jobId: job.id,
        error: error instanceof Error ? error.message : 'Unknown heartbeat failure',
      }),
    );
  }, heartbeatIntervalMs);
  try {
    if (job.status === 'retrying') await queue.updateProgress(lease, 'validating', job.progress);
    else await queue.updateProgress(lease, 'validating', Math.max(job.progress, 1));

    logger.info('analysis_job_claimed', {
      jobId: job.id,
      organizationId: job.organizationId,
      attempt: job.attempt,
      maxAttempts: job.maxAttempts,
    });

    throw new AppError(
      'ANALYSIS_UNAVAILABLE',
      'The crawler and persistence pipeline is not configured.',
      503,
    );
  } catch (error) {
    clearInterval(heartbeat);
    const result = await queue.fail(lease, {
      code: error instanceof AppError ? error.code : 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown analysis worker failure',
    });
    logger.error('analysis_job_failed', {
      jobId: job.id,
      attempt: job.attempt,
      retryScheduled: result.retry,
      error: error instanceof Error ? error.message : 'Unknown analysis worker failure',
    });
  } finally {
    clearInterval(heartbeat);
  }
}

async function startWorker() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to start the worker.');
  }
  const environment = loadWorkerEnvironment();
  const workerId = environment.WORKER_ID ?? `${hostname()}-${process.pid}`;
  const queue = new PostgresAnalysisJobQueue();
  const shutdownController = new AbortController();
  let lastRecoveryAt = 0;

  const shutdown = (signal: string) => {
    logger.info('worker_shutdown_requested', { signal, workerId });
    shutdownController.abort();
  };
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));

  try {
    const recovered = await queue.recoverAbandonedJobs(
      new Date(Date.now() - environment.WORKER_LOCK_TIMEOUT_MS),
    );
    lastRecoveryAt = Date.now();
    logger.info('worker_ready', { workerId, recoveredJobs: recovered });

    while (!shutdownController.signal.aborted) {
      if (Date.now() - lastRecoveryAt >= environment.WORKER_RECOVERY_INTERVAL_MS) {
        const recoveredJobs = await queue.recoverAbandonedJobs(
          new Date(Date.now() - environment.WORKER_LOCK_TIMEOUT_MS),
        );
        lastRecoveryAt = Date.now();
        if (recoveredJobs > 0) logger.warn('abandoned_jobs_recovered', { recoveredJobs });
      }

      const job = await queue.claimNext(workerId);
      if (job)
        await processJob(
          queue,
          job,
          Math.max(1_000, Math.floor(environment.WORKER_LOCK_TIMEOUT_MS / 3)),
        );
      else await wait(environment.WORKER_POLL_INTERVAL_MS, shutdownController.signal);
    }
  } finally {
    await queue.disconnect();
    logger.info('worker_stopped', { workerId });
  }
}

startWorker().catch((error: unknown) => {
  logger.error('worker_start_failed', {
    error: error instanceof Error ? error.message : 'Unknown worker startup error',
  });
  process.exitCode = 1;
});
