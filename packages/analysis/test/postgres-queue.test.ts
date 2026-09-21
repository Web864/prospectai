import { describe, expect, it, vi } from 'vitest';
import {
  PostgresAnalysisJobQueue,
  calculateReservedUsage,
  retryDelayMs,
  shouldRetry,
} from '../src/index.js';

describe('PostgreSQL analysis queue policy', () => {
  it('uses bounded exponential retry delays', () => {
    expect(retryDelayMs(1)).toBe(1_000);
    expect(retryDelayMs(2)).toBe(2_000);
    expect(retryDelayMs(20)).toBe(60_000);
  });

  it('stops scheduling work at the configured attempt bound', () => {
    expect(shouldRetry(1, 3)).toBe(true);
    expect(shouldRetry(3, 3)).toBe(false);
  });

  it('holds reservations until they are released or reversed', () => {
    expect(
      calculateReservedUsage([
        { operation: 'RESERVED', quantity: 3 },
        { operation: 'CONSUMED', quantity: 2 },
        { operation: 'RELEASED', quantity: 1 },
      ]),
    ).toBe(2);
  });

  it('serializes capacity before checking idempotency and usage', async () => {
    const calls: string[] = [];
    const transaction = {
      $executeRaw: vi.fn(async () => {
        calls.push('advisory-lock');
      }),
      analysisJob: {
        findUnique: vi.fn(async () => {
          calls.push('idempotency');
          return { id: 'existing-job' };
        }),
      },
    };
    const database = {
      $transaction: vi.fn(async (work: (value: typeof transaction) => unknown) =>
        work(transaction),
      ),
    };
    const queue = new PostgresAnalysisJobQueue(database as never);

    await queue.reserveUsageAndEnqueue({
      organizationId: 'organization',
      analysisId: 'analysis',
      idempotencyKey: 'request',
      feature: 'analysis',
      allowance: 10,
      periodStart: new Date(0),
    });

    expect(calls).toEqual(['advisory-lock', 'idempotency']);
  });

  it('claims with a row lock that skips work owned by another worker', async () => {
    const query = vi.fn(async (strings: TemplateStringsArray) => {
      expect(strings.join('?')).toContain('FOR UPDATE SKIP LOCKED');
      return [];
    });
    const queue = new PostgresAnalysisJobQueue({ $queryRaw: query } as never);

    await expect(queue.claimNext('worker-1')).resolves.toBeNull();
  });
  it('recovers stale leases and exhausts bounded attempts in PostgreSQL', async () => {
    const transaction = {
      $queryRaw: vi.fn(async (query: { strings: readonly string[] }) => {
        const sql = query.strings.join('?');
        expect(sql).toContain('"lockedAt" <');
        expect(sql).toContain("'RETRY_PENDING'");
        expect(sql).toContain('"attempt" >= "maxAttempts"');
        return [];
      }),
    };
    const database = {
      $transaction: vi.fn(async (work: (value: typeof transaction) => unknown) =>
        work(transaction),
      ),
    };
    const queue = new PostgresAnalysisJobQueue(database as never);

    await expect(queue.recoverAbandonedJobs(new Date(0))).resolves.toBe(0);
  });

  it('fences heartbeats with worker identity and attempt number', async () => {
    const updateMany = vi.fn(async () => ({ count: 1 }));
    const queue = new PostgresAnalysisJobQueue({ analysisJob: { updateMany } } as never);

    await queue.heartbeat({ id: 'job', lockedBy: 'worker-1', attempt: 2 });

    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'job', lockedBy: 'worker-1', attempt: 2 }),
      }),
    );
  });
  it('atomically locks guest allowance before creating analysis work', async () => {
    const calls: string[] = [];
    const transaction = {
      $executeRaw: vi.fn(async () => calls.push('advisory-lock')),
      analysisJob: {
        findUnique: vi.fn(async () => {
          calls.push('idempotency');
          return null;
        }),
        create: vi.fn(async () => ({ id: 'job-1', analysisId: 'analysis-1' })),
      },
      usageLedger: {
        groupBy: vi.fn(async () => {
          calls.push('usage');
          return [];
        }),
        create: vi.fn(async () => ({ id: 'reservation-1' })),
      },
      website: { upsert: vi.fn(async () => ({ id: 'website-1' })) },
      websiteAnalysis: { create: vi.fn(async () => ({ id: 'analysis-1' })) },
    };
    const database = {
      $transaction: vi.fn(async (work: (value: typeof transaction) => unknown) =>
        work(transaction),
      ),
    };
    const queue = new PostgresAnalysisJobQueue(database as never);

    await queue.reserveGuestAnalysisAndEnqueue({
      organizationId: 'guest-organization',
      guestSessionId: 'guest-session',
      canonicalUrl: 'https://example.com/',
      domain: 'example.com',
      idempotencyKey: 'guest-request-1',
      allowance: 3,
      periodStart: new Date(0),
    });

    expect(calls.slice(0, 3)).toEqual(['advisory-lock', 'idempotency', 'usage']);
    expect(transaction.analysisJob.create).toHaveBeenCalledTimes(1);
    expect(transaction.usageLedger.create).toHaveBeenCalledTimes(1);
  });

  it('rejects a concurrent fourth guest reservation without creating work', async () => {
    const transaction = {
      $executeRaw: vi.fn(async () => undefined),
      analysisJob: { findUnique: vi.fn(async () => null), create: vi.fn() },
      usageLedger: {
        groupBy: vi.fn(async () => [{ operation: 'RESERVED', _sum: { quantity: 3 } }]),
        create: vi.fn(),
      },
      website: { upsert: vi.fn() },
      websiteAnalysis: { create: vi.fn() },
    };
    const database = {
      $transaction: vi.fn(async (work: (value: typeof transaction) => unknown) =>
        work(transaction),
      ),
    };
    const queue = new PostgresAnalysisJobQueue(database as never);

    await expect(
      queue.reserveGuestAnalysisAndEnqueue({
        organizationId: 'guest-organization',
        guestSessionId: 'guest-session',
        canonicalUrl: 'https://example.com/',
        domain: 'example.com',
        idempotencyKey: 'guest-request-4',
        allowance: 3,
        periodStart: new Date(0),
      }),
    ).rejects.toMatchObject({ code: 'GUEST_TRIAL_EXHAUSTED', status: 429 });
    expect(transaction.website.upsert).not.toHaveBeenCalled();
    expect(transaction.analysisJob.create).not.toHaveBeenCalled();
  });

  it('returns an existing guest job without reserving usage twice', async () => {
    const existing = { id: 'existing-job', analysisId: 'existing-analysis' };
    const transaction = {
      $executeRaw: vi.fn(async () => undefined),
      analysisJob: { findUnique: vi.fn(async () => existing), create: vi.fn() },
      usageLedger: { groupBy: vi.fn(), create: vi.fn() },
      website: { upsert: vi.fn() },
      websiteAnalysis: { create: vi.fn() },
    };
    const database = {
      $transaction: vi.fn(async (work: (value: typeof transaction) => unknown) =>
        work(transaction),
      ),
    };
    const queue = new PostgresAnalysisJobQueue(database as never);

    await expect(
      queue.reserveGuestAnalysisAndEnqueue({
        organizationId: 'guest-organization',
        guestSessionId: 'guest-session',
        canonicalUrl: 'https://example.com/',
        domain: 'example.com',
        idempotencyKey: 'duplicate-request',
        allowance: 3,
        periodStart: new Date(0),
      }),
    ).resolves.toEqual(existing);
    expect(transaction.usageLedger.groupBy).not.toHaveBeenCalled();
    expect(transaction.usageLedger.create).not.toHaveBeenCalled();
    expect(transaction.website.upsert).not.toHaveBeenCalled();
  });

  it('releases a guest credit after the final failed attempt', async () => {
    const job = {
      id: 'job-1',
      organizationId: 'guest-organization',
      analysisId: 'analysis-1',
      idempotencyKey: 'guest-request',
      attempt: 3,
      maxAttempts: 3,
      nextAttemptAt: new Date(0),
      usageFeature: 'guest_analysis',
      usageQuantity: 1,
    };
    const transaction = {
      analysisJob: {
        findFirst: vi.fn(async () => job),
        updateMany: vi.fn(async () => ({ count: 1 })),
      },
      websiteAnalysis: { updateMany: vi.fn(async () => ({ count: 1 })) },
      usageLedger: { upsert: vi.fn(async () => ({ id: 'release' })) },
    };
    const database = {
      $transaction: vi.fn(async (work: (value: typeof transaction) => unknown) =>
        work(transaction),
      ),
    };
    const queue = new PostgresAnalysisJobQueue(database as never);

    await expect(
      queue.fail(
        { id: 'job-1', lockedBy: 'worker-1', attempt: 3 },
        { code: 'ANALYSIS_FAILED', message: 'No useful result.' },
      ),
    ).resolves.toEqual({ retry: false, status: 'failed' });
    expect(transaction.usageLedger.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ operation: 'RELEASED', quantity: 1 }),
      }),
    );
  });
});
