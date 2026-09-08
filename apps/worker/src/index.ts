import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { createLogger } from '@prospectai/shared';
import type { AnalysisJobPayload } from '@prospectai/types';

const logger = createLogger('analysis-worker');
const redisUrl = process.env.REDIS_URL;
if (!redisUrl) throw new Error('REDIS_URL is required to start the worker.');
const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
const worker = new Worker<AnalysisJobPayload>(
  'analysis',
  async (job) => {
    logger.info('analysis_job_received', {
      jobId: job.data.jobId,
      organizationId: job.data.organizationId,
    });
    throw new Error(
      'The analysis pipeline has not yet been connected to crawl, persistence, and entitlement adapters.',
    );
  },
  { connection, concurrency: 2 },
);
worker.on('failed', (job, error) =>
  logger.error('analysis_job_failed', { jobId: job?.id, error: error.message }),
);
worker.on('ready', () => logger.info('worker_ready'));
