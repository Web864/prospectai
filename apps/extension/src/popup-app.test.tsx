// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PopupApp } from './popup-app';

type Handler = (url: string, init: RequestInit) => Response | Promise<Response>;

let local: Record<string, unknown>;
let session: Record<string, unknown>;
let tabUrl: string | undefined;
let handler: Handler;
let sent: unknown[];

function area(store: Record<string, unknown>) {
  return {
    get: vi.fn(async (keys: string | string[]) => {
      const requested = Array.isArray(keys) ? keys : [keys];
      return Object.fromEntries(
        requested.filter((key) => key in store).map((key) => [key, store[key]]),
      );
    }),
    set: vi.fn(async (values: Record<string, unknown>) => void Object.assign(store, values)),
    remove: vi.fn(async (keys: string | string[]) => {
      for (const key of Array.isArray(keys) ? keys : [keys]) delete store[key];
    }),
  };
}

const posts = (suffix: string) =>
  vi
    .mocked(fetch)
    .mock.calls.filter(([url, init]) => String(url).endsWith(suffix) && init?.method === 'POST');

const jobBody = (status: string, extra: Record<string, unknown> = {}) => ({
  data: {
    id: 'job-1',
    analysisId: 'cjld2cjxh0000qzrmn831i7rn',
    status,
    progress:
      { queued: 0, fetching: 15, extracting: 40, completed: 100, partial: 100, failed: 100 }[
        status
      ] ?? 60,
    attempt: 1,
    maxAttempts: 3,
    nextAttemptAt: new Date().toISOString(),
    startedAt: new Date().toISOString(),
    finishedAt: null,
    errorCode: null,
    errorMessage: null,
    updatedAt: new Date().toISOString(),
    ...extra,
  },
});

const registeredResult = (status: 'completed' | 'partial') => ({
  data: {
    id: 'cjld2cjxh0000qzrmn831i7rn',
    status,
    domain: 'acme.example',
    companyName: 'acme.example',
    analyzedAt: new Date().toISOString(),
    websiteScore: 52,
    opportunityScore: 78,
    confidence: 0.8,
    businessSummary: 'Acme sells industrial widgets.',
    aiStatus: status === 'partial' ? 'unavailable_not_configured' : 'completed',
    limitations: status === 'partial' ? ['AI analysis was not configured for this run.'] : [],
    findings: [
      {
        id: 'f1',
        category: 'seo',
        title: 'Missing meta description',
        evidence: 'No meta tag',
        interpretation: null,
        severity: 'LOW',
      },
      {
        id: 'f2',
        category: 'conversion',
        title: 'No contact form',
        evidence: 'No form found',
        interpretation: null,
        severity: 'HIGH',
      },
    ],
    opportunities: [
      {
        id: 'cjld2cjxh0001qzrmn831i7rn',
        title: 'Conversion opportunity',
        serviceCategory: 'Conversion optimization',
        summary: 's',
        opportunityScore: 78,
        confidence: 0.8,
        commercialReason: 'Visitors have no way to enquire.',
        pitchAngle: 'Offer a contact funnel audit.',
      },
    ],
    pitches: [],
  },
});

const guestSession = (remaining = 3) => ({
  data: {
    mode: 'guest',
    trialLimit: 3,
    trialUsed: 3 - remaining,
    trialRemaining: remaining,
    quotaReached: remaining === 0,
    sessionId: 'guest-session',
    status: 'active',
    expiresAt: '2030-01-01T00:00:00.000Z',
  },
});

beforeEach(() => {
  local = {};
  session = {};
  sent = [];
  tabUrl = 'https://acme.example/';
  handler = () => Response.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => handler(String(url), init ?? {})),
  );
  vi.stubGlobal('chrome', {
    tabs: { query: vi.fn(async () => [{ url: tabUrl }]), create: vi.fn() },
    runtime: {
      sendMessage: vi.fn(async (message: unknown) => {
        sent.push(message);
        return { started: true, ok: true };
      }),
    },
    storage: {
      local: area(local),
      session: area(session),
      onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
    },
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('popup workflow', () => {
  it('explains unsupported pages without touching the network', async () => {
    tabUrl = 'chrome://settings';
    render(<PopupApp />);
    expect(
      await screen.findByRole('heading', { name: 'This page cannot be analyzed' }),
    ).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('creates exactly one job when Analyze is clicked repeatedly', async () => {
    local.accessToken = 'access-token';
    local.refreshToken = 'refresh-token';
    local.accessTokenExpiresAt = '2030-01-01T00:00:00.000Z';
    handler = (url, init) => {
      if (url.endsWith('/usage'))
        return Response.json({
          data: {
            plan: 'free',
            used: 1,
            limit: 10,
            remaining: 9,
            periodStart: '2026-11-01T00:00:00.000Z',
            periodEnd: '2026-12-01T00:00:00.000Z',
            quotaReached: false,
          },
        });
      if (url.endsWith('/analyses') && init.method === 'POST')
        return Response.json(
          { data: { jobId: 'job-1', analysisId: 'cjld2cjxh0000qzrmn831i7rn', status: 'queued' } },
          { status: 202 },
        );
      if (url.includes('/analysis-jobs/')) return Response.json(jobBody('fetching'));
      return Response.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
    };
    render(<PopupApp />);
    const button = await screen.findByRole('button', { name: /Analyze acme\.example/ });
    expect(await screen.findByText('9 of 10 analyses left this period')).toBeTruthy();
    await act(async () => {
      button.click();
      button.click();
      button.click();
    });
    expect(await screen.findByRole('heading', { name: 'Analysis in progress' })).toBeTruthy();
    expect(posts('/analyses')).toHaveLength(1);
    expect(new Headers(posts('/analyses')[0]?.[1]?.headers).get('Idempotency-Key')).toBeTruthy();
    expect(local.activeAnalysis).toMatchObject({
      jobId: 'job-1',
      domain: 'acme.example',
      url: 'https://acme.example/',
    });
    expect(local.pendingAnalysisSubmission).toBeUndefined();
    // Real, persisted progress only.
    expect(await screen.findByText(/15%/)).toBeTruthy();
  });

  it('resumes the stored job on reopen, even from another tab, without submitting again', async () => {
    tabUrl = 'https://other.example/';
    local.guestToken = 'g'.repeat(43);
    local.activeAnalysis = {
      jobId: 'job-1',
      mode: 'guest',
      url: 'https://acme.example/',
      domain: 'acme.example',
      submittedAt: new Date(Date.now() - 20_000).toISOString(),
      status: 'extracting',
    };
    handler = (url) =>
      url.includes('/analysis-jobs/job-1')
        ? Response.json(jobBody('extracting'))
        : Response.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
    render(<PopupApp />);
    expect(await screen.findByRole('heading', { name: 'Analysis in progress' })).toBeTruthy();
    expect(screen.getByText('acme.example')).toBeTruthy();
    expect(await screen.findByText(/40%/)).toBeTruthy();
    expect(posts('/guest-analyses')).toHaveLength(0);
  });

  it('keeps the job and reconnects when the network drops while polling', async () => {
    local.guestToken = 'g'.repeat(43);
    local.activeAnalysis = {
      jobId: 'job-1',
      mode: 'guest',
      url: 'https://acme.example/',
      domain: 'acme.example',
      submittedAt: new Date().toISOString(),
    };
    handler = () => Promise.reject(new TypeError('Failed to fetch'));
    render(<PopupApp />);
    expect(
      await screen.findByText(/ProspectAI could not reach the service\. Reconnecting/),
    ).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Analysis in progress' })).toBeTruthy();
    expect(local.activeAnalysis).toBeDefined();
  });

  it('shows a truthful partial result with AI unavailable, plus save and pitch actions', async () => {
    local.accessToken = 'access-token';
    local.refreshToken = 'refresh-token';
    local.accessTokenExpiresAt = '2030-01-01T00:00:00.000Z';
    local.activeAnalysis = {
      jobId: 'job-1',
      mode: 'registered',
      url: 'https://acme.example/',
      domain: 'acme.example',
      submittedAt: new Date().toISOString(),
    };
    handler = (url, init) => {
      if (url.includes('/analysis-jobs/')) return Response.json(jobBody('partial'));
      if (url.endsWith('/analyses/cjld2cjxh0000qzrmn831i7rn'))
        return Response.json(registeredResult('partial'));
      if (url.endsWith('/leads') && init.method === 'POST')
        return Response.json(
          { error: { code: 'CONFLICT', details: { leadId: 'lead-9' } } },
          { status: 409 },
        );
      if (url.endsWith('/pitches') && init.method === 'POST')
        return Response.json({ error: { code: 'AI_UNAVAILABLE' } }, { status: 503 });
      if (url.endsWith('/usage')) return Response.json({ error: { code: 'X' } }, { status: 500 });
      return Response.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
    };
    render(<PopupApp />);
    expect(await screen.findByRole('heading', { name: 'Partial result ready' })).toBeTruthy();
    expect(screen.getByText('Partial result')).toBeTruthy();
    expect(
      screen.getByText(/The website analysis completed, but AI-generated insight is unavailable/),
    ).toBeTruthy();
    expect(screen.getByText(/AI analysis was not configured for this run/)).toBeTruthy();
    expect(screen.queryByText(/failed/i)).toBeNull();
    // Highest severity first.
    const problems = screen
      .getAllByText(/No contact form|Missing meta description/)
      .map((node) => node.textContent);
    expect(problems[0]).toBe('No contact form');
    expect(screen.getByRole('link', { name: /Open full report/ }).getAttribute('href')).toBe(
      'http://localhost:3000/app/analysis/cjld2cjxh0000qzrmn831i7rn',
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Save prospect' }));
    expect(await screen.findByText(/Already in your prospects/)).toBeTruthy();
    expect(screen.getByRole('link', { name: /View prospect/ }).getAttribute('href')).toBe(
      'http://localhost:3000/app/leads/lead-9',
    );
    await user.click(screen.getByRole('button', { name: 'Generate pitch' }));
    expect(await screen.findByText(/Pitch writing is unavailable right now/)).toBeTruthy();
    expect(local.activeAnalysis).toMatchObject({ seen: true, status: 'partial' });
  });

  it('explains a crawler failure from the persisted job error code', async () => {
    local.guestToken = 'g'.repeat(43);
    local.activeAnalysis = {
      jobId: 'job-1',
      mode: 'guest',
      url: 'https://acme.example/',
      domain: 'acme.example',
      submittedAt: new Date().toISOString(),
    };
    handler = (url) => {
      if (url.includes('/analysis-jobs/'))
        return Response.json(
          jobBody('failed', {
            errorCode: 'WEBSITE_UNREACHABLE',
            errorMessage: 'The website returned HTTP 503.',
          }),
        );
      if (url.endsWith('/guest-sessions')) return Response.json(guestSession(2), { status: 201 });
      return Response.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
    };
    render(<PopupApp />);
    expect(
      await screen.findByRole('heading', { name: 'We could not access the website' }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });

  it('separates a registered quota limit from rate limiting', async () => {
    local.accessToken = 'access-token';
    local.refreshToken = 'refresh-token';
    local.accessTokenExpiresAt = '2030-01-01T00:00:00.000Z';
    handler = (url, init) => {
      if (url.endsWith('/usage'))
        return Response.json({
          data: {
            plan: 'free',
            used: 9,
            limit: 10,
            remaining: 1,
            periodStart: '2026-11-01T00:00:00.000Z',
            periodEnd: '2026-12-01T00:00:00.000Z',
            quotaReached: false,
          },
        });
      if (url.endsWith('/analyses') && init.method === 'POST')
        return Response.json({ error: { code: 'USAGE_LIMIT_REACHED' } }, { status: 429 });
      return Response.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
    };
    render(<PopupApp />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /Analyze acme\.example/ }));
    expect(
      await screen.findByRole('heading', { name: 'Your analysis limit has been reached' }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'See plans' })).toBeTruthy();
    expect(local.pendingAnalysisSubmission).toBeUndefined();
  });

  it('says the session expired instead of silently falling back to guest mode', async () => {
    local.sessionState = 'expired';
    render(<PopupApp />);
    expect(await screen.findByRole('heading', { name: 'Your session has expired' })).toBeTruthy();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Sign in again' }));
    expect(sent).toContainEqual({ type: 'start-sign-in', provider: 'account' });
    expect(screen.getByRole('heading', { name: 'Finish signing in' })).toBeTruthy();
  });

  it('never presents a failed preserved guest analysis as a finished report after sign-in', async () => {
    local.accessToken = 'access-token';
    local.refreshToken = 'refresh-token';
    local.accessTokenExpiresAt = '2030-01-01T00:00:00.000Z';
    local.lastConvertedAnalysisId = 'cjld2cjxh0000qzrmn831i7rn';
    handler = (url) => {
      if (url.endsWith('/analyses/cjld2cjxh0000qzrmn831i7rn'))
        return Response.json({
          data: {
            ...registeredResult('completed').data,
            status: 'failed',
            websiteScore: null,
            opportunityScore: null,
            findings: [],
            opportunities: [],
          },
        });
      if (url.endsWith('/usage'))
        return Response.json({
          data: {
            plan: 'free',
            used: 0,
            limit: 10,
            remaining: 10,
            periodStart: '2026-11-01T00:00:00.000Z',
            periodEnd: '2026-12-01T00:00:00.000Z',
            quotaReached: false,
          },
        });
      return Response.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
    };
    render(<PopupApp />);
    expect(await screen.findByRole('heading', { name: 'Ready to analyze' })).toBeTruthy();
    expect(screen.queryByText('Complete')).toBeNull();
    expect(local.lastConvertedAnalysisId).toBeUndefined();
  });

  it('starts a guest at the free-trial entry and keeps the guest token out of messages', async () => {
    handler = (url) =>
      url.endsWith('/guest-sessions')
        ? Response.json(guestSession(3), { status: 201 })
        : Response.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
    render(<PopupApp />);
    expect(await screen.findByRole('heading', { name: 'Ready to analyze' })).toBeTruthy();
    await waitFor(() => expect(screen.getByText('3 of 3 free analyses left')).toBeTruthy());
    expect(typeof local.guestToken).toBe('string');
    expect(JSON.stringify(sent)).not.toContain(String(local.guestToken));
  });
});
