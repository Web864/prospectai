import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '@prospectai/shared';
import { extractPage } from '@prospectai/crawler';
const mocks = vi.hoisted(() => ({ crawl: vi.fn(), business: vi.fn(), find: vi.fn() }));
vi.mock('@prospectai/database', () => ({ prisma: { websiteAnalysis: { findFirst: mocks.find } } }));
vi.mock('@prospectai/ai', async (original) => ({
  ...(await original<object>()),
  analyzeBusiness: mocks.business,
}));
vi.mock('@prospectai/crawler', async (original) => ({
  ...(await original<object>()),
  HttpFirstCrawler: class {
    crawl = mocks.crawl;
  },
}));
import { processJob } from '../src/index';

function harness() {
  const transaction = {
    opportunity: { deleteMany: vi.fn(), create: vi.fn() },
    finding: { deleteMany: vi.fn(), create: vi.fn().mockResolvedValue({ id: 'finding-test' }) },
    websiteAnalysis: { update: vi.fn() },
    website: { update: vi.fn() },
  };
  const queue = {
    heartbeat: vi.fn(),
    updateProgress: vi.fn(),
    withLease: vi.fn(async (_lease, work: (transaction: object) => Promise<void>) =>
      work(transaction),
    ),
    complete: vi.fn(),
    fail: vi.fn().mockResolvedValue({ retry: false }),
  };
  const job = {
    id: 'job-test',
    analysisId: 'analysis-test',
    organizationId: 'organization-test',
    attempt: 1,
    maxAttempts: 3,
    lockedBy: 'worker-test',
    status: 'validating',
    progress: 0,
    lockedAt: new Date(),
    idempotencyKey: 'test-submission',
  };
  return { queue, transaction, job, run: () => processJob(queue as never, job as never, 100_000) };
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('OPENAI_API_KEY', 'test-only');
  vi.stubEnv('AI_PROVIDER', 'openai');
  vi.stubEnv('GUEST_SESSION_PEPPER', 'g'.repeat(32));
  const page = extractPage(
    '<html lang="en"><head><title>Public business</title></head><body><h1>Business services</h1><p>Public business evidence.</p></body></html>',
    new URL('https://public.test/'),
    { status: 200, contentType: 'text/html', responseTimeMs: 5 },
  );
  mocks.crawl.mockResolvedValue({ page, finalUrl: page.url });
  mocks.find.mockResolvedValue({
    id: 'analysis-test',
    websiteId: 'website-test',
    website: { canonicalUrl: 'https://public.test/', domain: 'public.test' },
    organization: { memberships: [] },
  });
  mocks.business.mockResolvedValue({
    summary: 'Validated summary',
    companyName: 'Public business',
    confidence: 0.8,
  });
});
afterEach(() => vi.unstubAllEnvs());
describe('worker terminal outcomes and atomic persistence', () => {
  it('persists validated AI success and completes inside the fenced transaction', async () => {
    const h = harness();
    await h.run();
    expect(h.queue.complete).toHaveBeenCalledWith(expect.any(Object), 'completed', h.transaction);
    expect(h.transaction.websiteAnalysis.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          aiStatus: 'completed',
          businessSummary: 'Validated summary',
        }),
      }),
    );
    expect(h.queue.updateProgress.mock.calls.map((call) => [call[1], call[2]])).toEqual([
      ['validating', 5],
      ['fetching', 15],
      ['extracting', 40],
      ['rule_analysis', 60],
      ['ai_processing', 75],
      ['opportunity_scoring', 90],
    ]);
    expect(h.queue.fail).not.toHaveBeenCalled();
  });
  it.each(['quota', 'timeout', 'invalid_output', 'provider'])(
    'persists intentional partial on AI %s without retrying the job',
    async (reason) => {
      mocks.business.mockRejectedValue(
        new AppError('AI_UNAVAILABLE', 'AI unavailable.', 503, { reason }),
      );
      const h = harness();
      await h.run();
      expect(h.queue.complete).toHaveBeenCalledWith(expect.any(Object), 'partial', h.transaction);
      expect(h.transaction.websiteAnalysis.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ aiStatus: `unavailable_${reason}` }),
        }),
      );
      expect(h.queue.fail).not.toHaveBeenCalled();
    },
  );
  it.each(['PRIVATE_NETWORK_BLOCKED', 'ANALYSIS_TIMEOUT'])(
    'passes crawler %s to queue policy without publishing a result',
    async (code) => {
      mocks.crawl.mockRejectedValue(new AppError(code as 'ANALYSIS_TIMEOUT', 'Crawl failed.', 422));
      const h = harness();
      await h.run();
      expect(h.queue.fail).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ code }),
      );
      expect(h.queue.complete).not.toHaveBeenCalled();
    },
  );
  it('does not publish after lease loss', async () => {
    const h = harness();
    h.queue.updateProgress.mockRejectedValue(new AppError('CONFLICT', 'Lease lost.', 409));
    await h.run();
    expect(h.queue.complete).not.toHaveBeenCalled();
    expect(h.queue.fail).not.toHaveBeenCalled();
  });
});
