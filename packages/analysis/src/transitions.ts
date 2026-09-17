import { AppError } from '@prospectai/shared';
import type { AnalysisJobStatus } from '@prospectai/types';

const transitions: Record<AnalysisJobStatus, readonly AnalysisJobStatus[]> = {
  queued: ['validating', 'cancelled'],
  validating: ['fetching', 'failed', 'cancelled', 'retry_pending'],
  fetching: ['rendering', 'extracting', 'failed', 'cancelled', 'retry_pending'],
  rendering: ['extracting', 'failed', 'cancelled', 'retry_pending'],
  extracting: ['rule_analysis', 'failed', 'cancelled', 'retry_pending'],
  rule_analysis: ['ai_processing', 'opportunity_scoring', 'partial', 'failed', 'retry_pending'],
  ai_processing: ['opportunity_scoring', 'partial', 'failed', 'retry_pending'],
  opportunity_scoring: ['completed', 'partial', 'failed', 'retry_pending'],
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
