import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '@prospectai/shared';
const mocks = vi.hoisted(() => ({
  actor: vi.fn(),
  guest: vi.fn(),
  find: vi.fn(),
  generate: vi.fn(),
  rate: vi.fn(),
}));
vi.mock('../../../../../../lib/request-actor', () => ({ requireRequestActor: mocks.actor }));
vi.mock('../../../../../../lib/guest-session', () => ({ requireGuestSession: mocks.guest }));
vi.mock('@prospectai/database', () => ({ prisma: { websiteAnalysis: { findFirst: mocks.find } } }));
vi.mock('../../../../../../lib/rate-limit', () => ({ enforceRateLimit: mocks.rate }));
vi.mock('../../../../../../lib/analysis-pdf', async (original) => ({
  ...(await original<object>()),
  generateAnalysisPdf: mocks.generate,
}));
import { GET } from './route';
const record = {
  id: 'analysis',
  status: 'PARTIAL',
  completedAt: new Date(),
  websiteScore: 62,
  opportunityScore: 81,
  confidence: 0.8,
  businessSummary: null,
  aiStatus: 'unavailable_quota',
  website: { domain: 'acme.test', canonicalUrl: 'https://acme.test' },
  findings: [],
  opportunities: [],
};
function request(authorization?: string) {
  return GET(
    new Request('http://localhost/api/v1/analyses/analysis/pdf', {
      headers: authorization ? { Authorization: authorization } : {},
    }),
    { params: Promise.resolve({ analysisId: 'analysis' }) },
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.actor.mockResolvedValue({ organizationId: 'org-a' });
  mocks.guest.mockResolvedValue({ organizationId: 'org-guest', id: 'guest-a' });
  mocks.find.mockResolvedValue(record);
  mocks.generate.mockResolvedValue(new TextEncoder().encode('%PDF-test'));
});
describe('PDF export authorization boundary', () => {
  it.each(['COMPLETED', 'PARTIAL'])('exports authorized %s persisted results', async (status) => {
    mocks.find.mockResolvedValue({ ...record, status });
    const response = await request();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/pdf');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('content-disposition')).toBe(
      'attachment; filename="ProspectAI-acme.test-analysis.pdf"',
    );
    expect(mocks.find.mock.calls[0]?.[0].where).toEqual({
      id: 'analysis',
      organizationId: 'org-a',
    });
    expect(mocks.generate.mock.calls[0]?.[0].limitations).toEqual(
      status === 'PARTIAL' ? expect.arrayContaining([expect.stringContaining('allowance')]) : [],
    );
  });
  it('rejects unauthenticated requests before loading data', async () => {
    mocks.actor.mockRejectedValue(new AppError('UNAUTHENTICATED', 'Authentication required.', 401));
    expect((await request()).status).toBe(401);
    expect(mocks.find).not.toHaveBeenCalled();
    expect(mocks.generate).not.toHaveBeenCalled();
  });
  it('returns 404 for another tenant and never generates a report', async () => {
    mocks.find.mockImplementation(async ({ where }) =>
      where.organizationId === 'org-b' ? record : null,
    );
    expect((await request()).status).toBe(404);
    expect(mocks.generate).not.toHaveBeenCalled();
  });
  it('restricts guest exports to the exact session and organization', async () => {
    expect((await request('Guest test-only')).status).toBe(200);
    expect(mocks.actor).not.toHaveBeenCalled();
    expect(mocks.find.mock.calls[0]?.[0].where).toEqual({
      id: 'analysis',
      organizationId: 'org-guest',
      guestSessionId: 'guest-a',
    });
    mocks.find.mockResolvedValue(null);
    expect((await request('Guest test-only')).status).toBe(404);
  });
  it('rejects an invalid guest instead of falling back to registered auth', async () => {
    mocks.guest.mockRejectedValue(new AppError('GUEST_SESSION_INVALID', 'Invalid guest.', 401));
    expect((await request('Guest invalid')).status).toBe(401);
    expect(mocks.actor).not.toHaveBeenCalled();
  });
  it.each(['QUEUED', 'AI_PROCESSING', 'FAILED', 'CANCELED'])(
    'does not export %s',
    async (status) => {
      mocks.find.mockResolvedValue({ ...record, status });
      expect((await request()).status).toBe(409);
      expect(mocks.generate).not.toHaveBeenCalled();
    },
  );
  it('redacts generation failures', async () => {
    mocks.generate.mockRejectedValue(new Error('private database metadata'));
    const response = await request();
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain('private database metadata');
  });
});
