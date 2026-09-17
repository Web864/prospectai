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
});
