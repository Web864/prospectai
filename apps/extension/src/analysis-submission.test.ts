import { afterEach, describe, expect, it, vi } from 'vitest';
import { analysisSubmissionKey } from './analysis-submission';
afterEach(() => vi.unstubAllGlobals());
describe('ambiguous submission recovery', () => {
  it('preserves the same idempotency key across popup reopen until the job is stored', async () => {
    const storage: Record<string, unknown> = {};
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: async (key: string) => ({ [key]: storage[key] }),
          set: async (value: Record<string, unknown>) => Object.assign(storage, value),
        },
      },
    });
    const first = await analysisSubmissionKey('guest', 'https://iana.org/');
    expect(await analysisSubmissionKey('guest', 'https://iana.org/')).toBe(first);
    expect(await analysisSubmissionKey('registered', 'https://iana.org/')).not.toBe(first);
  });
});
