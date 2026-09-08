import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { AppError } from '@prospectai/shared';
import type { AnalysisJobPayload, AnalysisJobStatus } from '@prospectai/types';

const transitions: Record<AnalysisJobStatus, readonly AnalysisJobStatus[]> = {
  queued: ['validating', 'cancelled'],
  validating: ['fetching', 'failed', 'cancelled'],
  fetching: ['rendering', 'extracting', 'failed', 'cancelled', 'retry_pending'],
  rendering: ['extracting', 'failed', 'cancelled', 'retry_pending'],
  extracting: ['rule_analysis', 'failed', 'cancelled'],
  rule_analysis: ['ai_processing', 'opportunity_scoring', 'partial', 'failed'],
  ai_processing: ['opportunity_scoring', 'partial', 'failed'],
  opportunity_scoring: ['completed', 'partial', 'failed'],
  completed: [],
  partial: [],
  failed: ['retry_pending'],
  cancelled: [],
  retry_pending: ['retrying'],
  retrying: ['validating', 'failed'],
};

export function assertJobTransition(from: AnalysisJobStatus, to: AnalysisJobStatus) {
  if (!transitions[from].includes(to))
    throw new AppError('CONFLICT', `Invalid analysis job transition: ${from} to ${to}.`, 409);
}

export interface AnalysisQueue {
  enqueue(payload: AnalysisJobPayload): Promise<void>;
}

export function createBullMqAnalysisQueue(redisUrl: string): AnalysisQueue {
  const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
  const queue = new Queue<AnalysisJobPayload>('analysis', { connection });
  return {
    enqueue: async (payload) => {
      await queue.add('analyze', payload, {
        jobId: payload.jobId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 1_000 },
        removeOnComplete: 500,
        removeOnFail: 1_000,
      });
    },
  };
}
