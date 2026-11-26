import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  analysisSubmissionKey,
  clearActiveAnalysis,
  patchActiveAnalysis,
  readActiveAnalysis,
  writeActiveAnalysis,
} from './job-store';

let storage: Record<string, unknown>;
beforeEach(() => {
  storage = {};
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: async (key: string) => ({ [key]: storage[key] }),
        set: async (value: Record<string, unknown>) => Object.assign(storage, value),
        remove: async (keys: string | string[]) => {
          for (const key of Array.isArray(keys) ? keys : [keys]) delete storage[key];
        },
      },
    },
  });
});

const record = (overrides = {}) => ({
  jobId: 'job-1',
  analysisId: 'analysis-1',
  mode: 'guest' as const,
  url: 'https://example.com/',
  domain: 'example.com',
  submittedAt: new Date().toISOString(),
  ...overrides,
});

describe('submission idempotency', () => {
  it('keeps the same key across popup reopen until the job is stored', async () => {
    const first = await analysisSubmissionKey('guest', 'https://iana.org/');
    expect(await analysisSubmissionKey('guest', 'https://iana.org/')).toBe(first);
    expect(await analysisSubmissionKey('registered', 'https://iana.org/')).not.toBe(first);
  });
});

describe('active analysis persistence', () => {
  it('round-trips the minimal job identity without page content or tokens', async () => {
    await writeActiveAnalysis(record());
    const stored = await readActiveAnalysis();
    expect(stored).toEqual(record({ submittedAt: stored?.submittedAt }));
    expect(Object.keys(stored ?? {})).not.toContain('accessToken');
  });

  it('drops malformed and day-old records so they cannot block new work', async () => {
    storage.activeAnalysis = { jobId: 1 };
    expect(await readActiveAnalysis()).toBeUndefined();
    expect(storage.activeAnalysis).toBeUndefined();
    await writeActiveAnalysis(
      record({ submittedAt: new Date(Date.now() - 25 * 3_600_000).toISOString() }),
    );
    expect(await readActiveAnalysis()).toBeUndefined();
  });

  it('never lets an update for one job overwrite a different job', async () => {
    await writeActiveAnalysis(record({ jobId: 'job-2' }));
    expect(await patchActiveAnalysis('job-1', { status: 'completed' })).toBeUndefined();
    expect((await readActiveAnalysis())?.status).toBeUndefined();
    await clearActiveAnalysis('job-1');
    expect(await readActiveAnalysis()).toBeDefined();
    await clearActiveAnalysis('job-2');
    expect(await readActiveAnalysis()).toBeUndefined();
  });
});
