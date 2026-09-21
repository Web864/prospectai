import { AnalysisJobStatus as DatabaseJobStatus, Prisma } from '@prisma/client';
import { prisma as defaultDatabase } from '@prospectai/database';
import { AppError } from '@prospectai/shared';
import type { AnalysisJobStatus } from '@prospectai/types';
import { assertJobTransition } from './transitions';

const statusToDatabase: Record<AnalysisJobStatus, DatabaseJobStatus> = {
  queued: 'QUEUED',
  validating: 'VALIDATING',
  fetching: 'FETCHING',
  rendering: 'RENDERING',
  extracting: 'EXTRACTING',
  rule_analysis: 'RULE_ANALYSIS',
  ai_processing: 'AI_PROCESSING',
  opportunity_scoring: 'OPPORTUNITY_SCORING',
  completed: 'COMPLETED',
  partial: 'PARTIAL',
  failed: 'FAILED',
  cancelled: 'CANCELED',
  retry_pending: 'RETRY_PENDING',
  retrying: 'RETRYING',
};

const statusFromDatabase = Object.fromEntries(
  Object.entries(statusToDatabase).map(([domain, database]) => [database, domain]),
) as Record<DatabaseJobStatus, AnalysisJobStatus>;

type Database = typeof defaultDatabase;
type Transaction = Prisma.TransactionClient;

interface ClaimedRow {
  id: string;
  organizationId: string;
  analysisId: string;
  idempotencyKey: string;
  status: DatabaseJobStatus;
  attempt: number;
  maxAttempts: number;
  progress: number;
  lockedAt: Date;
  lockedBy: string;
}

interface RecoveredRow {
  id: string;
  organizationId: string;
  analysisId: string;
  idempotencyKey: string;
  usageFeature: string;
  usageQuantity: number;
  status: DatabaseJobStatus;
}

export interface ClaimedAnalysisJob {
  id: string;
  organizationId: string;
  analysisId: string;
  idempotencyKey: string;
  status: AnalysisJobStatus;
  attempt: number;
  maxAttempts: number;
  progress: number;
  lockedAt: Date;
  lockedBy: string;
}

export interface AnalysisJobProgress {
  id: string;
  analysisId: string;
  status: AnalysisJobStatus;
  progress: number;
  attempt: number;
  maxAttempts: number;
  nextAttemptAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  errorCode: string | null;
  errorMessage: string | null;
  updatedAt: Date;
}

export interface ReserveUsageAndEnqueueInput {
  organizationId: string;
  analysisId: string;
  idempotencyKey: string;
  feature: string;
  allowance: number;
  periodStart: Date;
  quantity?: number;
  maxAttempts?: number;
}

export interface ReserveAnalysisInput {
  organizationId: string;
  canonicalUrl: string;
  domain: string;
  idempotencyKey: string;
  allowance: number;
  periodStart: Date;
  feature?: string;
  maxAttempts?: number;
}

export interface ReserveGuestAnalysisInput {
  organizationId: string;
  guestSessionId: string;
  canonicalUrl: string;
  domain: string;
  idempotencyKey: string;
  allowance: number;
  periodStart: Date;
  feature?: string;
  maxAttempts?: number;
}

export interface JobLease {
  id: string;
  lockedBy: string;
  attempt: number;
}

export function retryDelayMs(attempt: number, baseDelayMs = 1_000, capMs = 60_000) {
  return Math.min(capMs, baseDelayMs * 2 ** Math.max(0, attempt - 1));
}

export function shouldRetry(attempt: number, maxAttempts: number) {
  return attempt < maxAttempts;
}

export function calculateReservedUsage(
  groups: ReadonlyArray<{ operation: string; quantity: number }>,
) {
  return groups.reduce((total, group) => {
    if (group.operation === 'RESERVED') return total + group.quantity;
    if (group.operation === 'RELEASED' || group.operation === 'REVERSED')
      return total - group.quantity;
    return total;
  }, 0);
}

function toClaimedJob(row: ClaimedRow): ClaimedAnalysisJob {
  return { ...row, status: statusFromDatabase[row.status] };
}

function leaseWhere(lease: JobLease) {
  return {
    id: lease.id,
    lockedBy: lease.lockedBy,
    attempt: lease.attempt,
    lockedAt: { not: null },
  };
}

async function recordUsageOperation(
  transaction: Transaction,
  input: {
    organizationId: string;
    feature: string;
    idempotencyKey: string;
    operation: 'CONSUMED' | 'RELEASED';
    quantity: number;
    jobId: string;
  },
) {
  const lifecycleKey = `${input.idempotencyKey}:${input.operation.toLowerCase()}`;
  await transaction.usageLedger.upsert({
    where: {
      organizationId_feature_idempotencyKey: {
        organizationId: input.organizationId,
        feature: input.feature,
        idempotencyKey: lifecycleKey,
      },
    },
    create: {
      organizationId: input.organizationId,
      feature: input.feature,
      idempotencyKey: lifecycleKey,
      operation: input.operation,
      quantity: input.quantity,
      referenceType: 'AnalysisJob',
      referenceId: input.jobId,
    },
    update: {},
  });
}

export class PostgresAnalysisJobQueue {
  constructor(private readonly database: Database = defaultDatabase) {}

  async reserveUsageAndEnqueue(input: ReserveUsageAndEnqueueInput) {
    const quantity = input.quantity ?? 1;
    if (
      quantity < 1 ||
      input.allowance < 0 ||
      (input.maxAttempts !== undefined && input.maxAttempts < 1)
    )
      throw new AppError('VALIDATION_ERROR', 'Usage quantity or allowance is invalid.', 400);

    return this.database.$transaction(
      async (transaction) => {
        const lockKey = `${input.organizationId}:${input.feature}`;
        await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`;

        const existing = await transaction.analysisJob.findUnique({
          where: {
            organizationId_idempotencyKey: {
              organizationId: input.organizationId,
              idempotencyKey: input.idempotencyKey,
            },
          },
        });
        if (existing) return existing;

        const analysis = await transaction.websiteAnalysis.findFirst({
          where: { id: input.analysisId, organizationId: input.organizationId },
          select: { id: true },
        });
        if (!analysis)
          throw new AppError('NOT_FOUND', 'The analysis does not exist in this organization.', 404);

        const grouped = await transaction.usageLedger.groupBy({
          by: ['operation'],
          where: {
            organizationId: input.organizationId,
            feature: input.feature,
            createdAt: { gte: input.periodStart },
          },
          _sum: { quantity: true },
        });
        const reserved = calculateReservedUsage(
          grouped.map((entry) => ({
            operation: entry.operation,
            quantity: entry._sum.quantity ?? 0,
          })),
        );
        if (reserved + quantity > input.allowance)
          throw new AppError('USAGE_LIMIT_REACHED', 'Analysis usage limit reached.', 429);

        const job = await transaction.analysisJob.create({
          data: {
            organizationId: input.organizationId,
            analysisId: input.analysisId,
            idempotencyKey: input.idempotencyKey,
            usageFeature: input.feature,
            usageQuantity: quantity,
            ...(input.maxAttempts === undefined ? {} : { maxAttempts: input.maxAttempts }),
          },
        });
        await transaction.usageLedger.create({
          data: {
            organizationId: input.organizationId,
            feature: input.feature,
            idempotencyKey: `${input.idempotencyKey}:reserved`,
            operation: 'RESERVED',
            quantity,
            referenceType: 'AnalysisJob',
            referenceId: job.id,
          },
        });
        return job;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async reserveAnalysisAndEnqueue(input: ReserveAnalysisInput) {
    const feature = input.feature ?? 'analysis';
    return this.database.$transaction(
      async (transaction) => {
        const lockKey = `${input.organizationId}:${feature}`;
        await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`;
        const existing = await transaction.analysisJob.findUnique({
          where: {
            organizationId_idempotencyKey: {
              organizationId: input.organizationId,
              idempotencyKey: input.idempotencyKey,
            },
          },
        });
        if (existing) return existing;
        const grouped = await transaction.usageLedger.groupBy({
          by: ['operation'],
          where: {
            organizationId: input.organizationId,
            feature,
            createdAt: { gte: input.periodStart },
          },
          _sum: { quantity: true },
        });
        const reserved = calculateReservedUsage(
          grouped.map((entry) => ({
            operation: entry.operation,
            quantity: entry._sum.quantity ?? 0,
          })),
        );
        if (reserved >= input.allowance)
          throw new AppError('USAGE_LIMIT_REACHED', 'Analysis usage limit reached.', 429);
        const website = await transaction.website.upsert({
          where: {
            organizationId_domain: {
              organizationId: input.organizationId,
              domain: input.domain,
            },
          },
          create: {
            organizationId: input.organizationId,
            canonicalUrl: input.canonicalUrl,
            domain: input.domain,
          },
          update: { canonicalUrl: input.canonicalUrl },
        });
        const analysis = await transaction.websiteAnalysis.create({
          data: {
            organizationId: input.organizationId,
            websiteId: website.id,
            status: 'QUEUED',
          },
        });
        const job = await transaction.analysisJob.create({
          data: {
            organizationId: input.organizationId,
            analysisId: analysis.id,
            idempotencyKey: input.idempotencyKey,
            usageFeature: feature,
            usageQuantity: 1,
            ...(input.maxAttempts === undefined ? {} : { maxAttempts: input.maxAttempts }),
          },
        });
        await transaction.usageLedger.create({
          data: {
            organizationId: input.organizationId,
            feature,
            idempotencyKey: `${input.idempotencyKey}:reserved`,
            operation: 'RESERVED',
            quantity: 1,
            referenceType: 'AnalysisJob',
            referenceId: job.id,
          },
        });
        return job;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async reserveGuestAnalysisAndEnqueue(input: ReserveGuestAnalysisInput) {
    const feature = input.feature ?? 'guest_analysis';
    if (input.allowance < 0 || (input.maxAttempts !== undefined && input.maxAttempts < 1))
      throw new AppError('VALIDATION_ERROR', 'Guest allowance is invalid.', 400);

    return this.database.$transaction(
      async (transaction) => {
        const lockKey = `${input.organizationId}:${feature}`;
        await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`;

        const existing = await transaction.analysisJob.findUnique({
          where: {
            organizationId_idempotencyKey: {
              organizationId: input.organizationId,
              idempotencyKey: input.idempotencyKey,
            },
          },
        });
        if (existing) return existing;

        const grouped = await transaction.usageLedger.groupBy({
          by: ['operation'],
          where: {
            organizationId: input.organizationId,
            feature,
            createdAt: { gte: input.periodStart },
          },
          _sum: { quantity: true },
        });
        const reserved = calculateReservedUsage(
          grouped.map((entry) => ({
            operation: entry.operation,
            quantity: entry._sum.quantity ?? 0,
          })),
        );
        if (reserved >= input.allowance)
          throw new AppError(
            'GUEST_TRIAL_EXHAUSTED',
            'The guest analysis allowance has been used.',
            429,
          );

        const website = await transaction.website.upsert({
          where: {
            organizationId_domain: {
              organizationId: input.organizationId,
              domain: input.domain,
            },
          },
          create: {
            organizationId: input.organizationId,
            canonicalUrl: input.canonicalUrl,
            domain: input.domain,
          },
          update: { canonicalUrl: input.canonicalUrl },
        });
        const analysis = await transaction.websiteAnalysis.create({
          data: {
            organizationId: input.organizationId,
            guestSessionId: input.guestSessionId,
            websiteId: website.id,
            status: 'QUEUED',
          },
        });
        const job = await transaction.analysisJob.create({
          data: {
            organizationId: input.organizationId,
            guestSessionId: input.guestSessionId,
            analysisId: analysis.id,
            idempotencyKey: input.idempotencyKey,
            usageFeature: feature,
            usageQuantity: 1,
            ...(input.maxAttempts === undefined ? {} : { maxAttempts: input.maxAttempts }),
          },
        });
        await transaction.usageLedger.create({
          data: {
            organizationId: input.organizationId,
            feature,
            idempotencyKey: `${input.idempotencyKey}:reserved`,
            operation: 'RESERVED',
            quantity: 1,
            referenceType: 'AnalysisJob',
            referenceId: job.id,
          },
        });
        return job;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
  async claimNext(workerId: string): Promise<ClaimedAnalysisJob | null> {
    const rows = await this.database.$queryRaw<ClaimedRow[]>`
      WITH candidate AS (
        SELECT "id"
        FROM "AnalysisJob"
        WHERE "status" IN ('QUEUED'::"AnalysisJobStatus", 'RETRY_PENDING'::"AnalysisJobStatus")
          AND "nextAttemptAt" <= CURRENT_TIMESTAMP
          AND "lockedAt" IS NULL
          AND "attempt" < "maxAttempts"
        ORDER BY "nextAttemptAt" ASC, "createdAt" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      UPDATE "AnalysisJob" AS job
      SET "status" = CASE
            WHEN job."attempt" = 0 THEN 'VALIDATING'::"AnalysisJobStatus"
            ELSE 'RETRYING'::"AnalysisJobStatus"
          END,
          "attempt" = job."attempt" + 1,
          "lockedAt" = CURRENT_TIMESTAMP,
          "lockedBy" = ${workerId},
          "startedAt" = COALESCE(job."startedAt", CURRENT_TIMESTAMP),
          "finishedAt" = NULL,
          "errorCode" = NULL,
          "errorMessage" = NULL,
          "updatedAt" = CURRENT_TIMESTAMP
      FROM candidate
      WHERE job."id" = candidate."id"
      RETURNING job."id", job."organizationId", job."analysisId", job."idempotencyKey",
        job."status", job."attempt", job."maxAttempts", job."progress", job."lockedAt", job."lockedBy"
    `;
    return rows[0] ? toClaimedJob(rows[0]) : null;
  }

  async recoverAbandonedJobs(staleBefore: Date) {
    return this.database.$transaction(async (transaction) => {
      const rows = await transaction.$queryRaw<RecoveredRow[]>(Prisma.sql`
        UPDATE "AnalysisJob"
        SET "status" = CASE
              WHEN "attempt" >= "maxAttempts" THEN 'FAILED'::"AnalysisJobStatus"
              ELSE 'RETRY_PENDING'::"AnalysisJobStatus"
            END,
            "nextAttemptAt" = CURRENT_TIMESTAMP,
            "lockedAt" = NULL,
            "lockedBy" = NULL,
            "finishedAt" = CASE WHEN "attempt" >= "maxAttempts" THEN CURRENT_TIMESTAMP ELSE NULL END,
            "errorCode" = 'WORKER_LEASE_EXPIRED',
            "errorMessage" = 'The previous worker stopped updating its lease.',
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE "status" IN (
          'VALIDATING'::"AnalysisJobStatus",
          'FETCHING'::"AnalysisJobStatus",
          'RENDERING'::"AnalysisJobStatus",
          'EXTRACTING'::"AnalysisJobStatus",
          'RULE_ANALYSIS'::"AnalysisJobStatus",
          'AI_PROCESSING'::"AnalysisJobStatus",
          'OPPORTUNITY_SCORING'::"AnalysisJobStatus",
          'RETRYING'::"AnalysisJobStatus"
        )
          AND "lockedAt" < ${staleBefore}
        RETURNING "id", "organizationId", "analysisId", "idempotencyKey", "usageFeature", "usageQuantity", "status"
      `);

      for (const row of rows) {
        await transaction.websiteAnalysis.updateMany({
          where: { id: row.analysisId, organizationId: row.organizationId },
          data: { status: row.status },
        });
        if (row.status === 'FAILED')
          await recordUsageOperation(transaction, {
            organizationId: row.organizationId,
            feature: row.usageFeature,
            idempotencyKey: row.idempotencyKey,
            operation: 'RELEASED',
            quantity: row.usageQuantity,
            jobId: row.id,
          });
      }
      return rows.length;
    });
  }

  async updateProgress(
    lease: JobLease,
    status: AnalysisJobStatus,
    progress: number,
  ): Promise<void> {
    if (!Number.isInteger(progress) || progress < 0 || progress > 100)
      throw new AppError('VALIDATION_ERROR', 'Job progress must be an integer from 0 to 100.', 400);

    await this.database.$transaction(async (transaction) => {
      const current = await transaction.analysisJob.findFirst({
        where: leaseWhere(lease),
        select: { status: true },
      });
      if (!current)
        throw new AppError('CONFLICT', 'The worker no longer owns this job lease.', 409);
      const currentStatus = statusFromDatabase[current.status];
      if (currentStatus !== status) assertJobTransition(currentStatus, status);
      const updated = await transaction.analysisJob.updateMany({
        where: leaseWhere(lease),
        data: {
          status: statusToDatabase[status],
          progress,
          lockedAt: new Date(),
        },
      });
      if (updated.count !== 1)
        throw new AppError('CONFLICT', 'The worker no longer owns this job lease.', 409);
    });
  }

  async heartbeat(lease: JobLease): Promise<void> {
    const updated = await this.database.analysisJob.updateMany({
      where: leaseWhere(lease),
      data: { lockedAt: new Date() },
    });
    if (updated.count !== 1)
      throw new AppError('CONFLICT', 'The worker no longer owns this job lease.', 409);
  }
  async complete(lease: JobLease, outcome: 'completed' | 'partial') {
    await this.database.$transaction(async (transaction) => {
      const job = await transaction.analysisJob.findFirst({ where: leaseWhere(lease) });
      if (!job) throw new AppError('CONFLICT', 'The worker no longer owns this job lease.', 409);
      assertJobTransition(statusFromDatabase[job.status], outcome);
      const status = statusToDatabase[outcome];
      const updated = await transaction.analysisJob.updateMany({
        where: leaseWhere(lease),
        data: {
          status,
          progress: 100,
          lockedAt: null,
          lockedBy: null,
          finishedAt: new Date(),
        },
      });
      if (updated.count !== 1)
        throw new AppError('CONFLICT', 'The worker no longer owns this job lease.', 409);
      await transaction.websiteAnalysis.updateMany({
        where: { id: job.analysisId, organizationId: job.organizationId },
        data: { status, completedAt: new Date() },
      });
      await recordUsageOperation(transaction, {
        organizationId: job.organizationId,
        feature: job.usageFeature,
        idempotencyKey: job.idempotencyKey,
        operation: 'CONSUMED',
        quantity: job.usageQuantity,
        jobId: job.id,
      });
    });
  }

  async fail(lease: JobLease, error: { code: string; message: string }) {
    return this.database.$transaction(async (transaction) => {
      const job = await transaction.analysisJob.findFirst({ where: leaseWhere(lease) });
      if (!job) throw new AppError('CONFLICT', 'The worker no longer owns this job lease.', 409);
      const retry = shouldRetry(job.attempt, job.maxAttempts);
      const status: DatabaseJobStatus = retry ? 'RETRY_PENDING' : 'FAILED';
      const updated = await transaction.analysisJob.updateMany({
        where: leaseWhere(lease),
        data: {
          status,
          nextAttemptAt: retry
            ? new Date(Date.now() + retryDelayMs(job.attempt))
            : job.nextAttemptAt,
          lockedAt: null,
          lockedBy: null,
          errorCode: error.code,
          errorMessage: error.message,
          finishedAt: retry ? null : new Date(),
        },
      });
      if (updated.count !== 1)
        throw new AppError('CONFLICT', 'The worker no longer owns this job lease.', 409);
      await transaction.websiteAnalysis.updateMany({
        where: { id: job.analysisId, organizationId: job.organizationId },
        data: { status },
      });
      if (!retry)
        await recordUsageOperation(transaction, {
          organizationId: job.organizationId,
          feature: job.usageFeature,
          idempotencyKey: job.idempotencyKey,
          operation: 'RELEASED',
          quantity: job.usageQuantity,
          jobId: job.id,
        });
      return { retry, status: statusFromDatabase[status] };
    });
  }

  async cancel(organizationId: string, jobId: string) {
    return this.database.$transaction(async (transaction) => {
      const job = await transaction.analysisJob.findFirst({
        where: {
          id: jobId,
          organizationId,
          status: { in: ['QUEUED', 'RETRY_PENDING'] },
        },
      });
      if (!job) throw new AppError('CONFLICT', 'Only queued analysis jobs can be canceled.', 409);
      await transaction.analysisJob.update({
        where: { id: job.id },
        data: {
          status: 'CANCELED',
          progress: 100,
          finishedAt: new Date(),
          lockedAt: null,
          lockedBy: null,
        },
      });
      await transaction.websiteAnalysis.update({
        where: { id: job.analysisId },
        data: { status: 'CANCELED' },
      });
      await recordUsageOperation(transaction, {
        organizationId,
        feature: job.usageFeature,
        idempotencyKey: job.idempotencyKey,
        operation: 'RELEASED',
        quantity: job.usageQuantity,
        jobId: job.id,
      });
      return { status: 'cancelled' as const };
    });
  }

  async getProgress(organizationId: string, jobId: string): Promise<AnalysisJobProgress | null> {
    const job = await this.database.analysisJob.findFirst({
      where: { id: jobId, organizationId },
      select: {
        id: true,
        analysisId: true,
        status: true,
        progress: true,
        attempt: true,
        maxAttempts: true,
        nextAttemptAt: true,
        startedAt: true,
        finishedAt: true,
        errorCode: true,
        errorMessage: true,
        updatedAt: true,
      },
    });
    return job ? { ...job, status: statusFromDatabase[job.status] } : null;
  }

  async disconnect() {
    await this.database.$disconnect();
  }
}
