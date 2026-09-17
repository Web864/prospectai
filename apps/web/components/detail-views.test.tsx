import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AnalysisDetailView } from './analysis-detail-view';
import { LeadDetailView } from './lead-detail-view';
import { LeadListView } from './lead-list-view';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const lead = {
  data: {
    id: 'lead-1',
    name: 'Acme',
    domain: 'acme.test',
    status: 'qualified',
    opportunityScore: 81,
    latestAnalysisId: 'analysis-1',
    updatedAt: '2026-09-17T00:00:00.000Z',
    notes: '',
    contacts: [],
    recommendedServices: [],
    latestAnalysis: { id: 'analysis-1', websiteScore: 62, completedAt: '2026-09-17T00:00:00.000Z' },
    pitches: [],
    activity: [],
  },
};
const analysis = {
  data: {
    id: 'analysis-1',
    status: 'partial',
    domain: 'acme.test',
    companyName: 'Acme',
    analyzedAt: '2026-09-17T00:00:00.000Z',
    websiteScore: 62,
    opportunityScore: 81,
    confidence: 0.8,
    businessSummary: 'A software company.',
    findings: [
      {
        id: 'finding-1',
        category: 'Conversion',
        title: 'Missing proof',
        evidence: 'No proof near the primary action.',
        interpretation: 'Buyers may hesitate.',
      },
    ],
    opportunities: [
      {
        id: 'opp-1',
        title: 'Conversion redesign',
        serviceCategory: 'Web design',
        summary: 'Improve proof.',
        opportunityScore: 81,
        confidence: 0.8,
        commercialReason: 'The buying journey lacks proof.',
        pitchAngle: 'Lead with trust.',
      },
    ],
    pitches: [{ id: 'pitch-1', format: 'email', content: 'Original grounded pitch' }],
  },
};

describe('production detail integrations', () => {
  it('renders a lead returned by the API and protects archive', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation((_input: RequestInfo | URL, init?: RequestInit) =>
        init?.method
          ? Promise.resolve(json({ data: { message: 'Lead archived' } }))
          : Promise.resolve(json(lead)),
      );
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<LeadDetailView leadId="lead-1" />);
    expect(await screen.findByText('Company overview')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /More actions/ }));
    await user.click(screen.getByRole('menuitem', { name: 'Archive lead' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Archive lead' }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/leads/lead-1'),
        expect.objectContaining({ method: 'PATCH' }),
      ),
    );
  });

  it('renders an empty lead list from authoritative API data', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(json({ data: [], meta: { page: 1, totalPages: 0 } })),
    );
    render(<LeadListView />);
    expect(await screen.findByText('No saved leads match these filters')).toBeTruthy();
  });

  it('renders partial analysis evidence and grounded pitches', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(analysis)));
    const user = userEvent.setup();
    render(<AnalysisDetailView analysisId="analysis-1" />);
    expect(await screen.findByText('Some analysis stages did not complete')).toBeTruthy();
    expect(screen.getByText('No proof near the primary action.')).toBeTruthy();
    await user.click(screen.getByRole('tab', { name: 'Generated pitches' }));
    expect(screen.getByRole('textbox', { name: 'email pitch' })).toHaveProperty(
      'value',
      'Original grounded pitch',
    );
  });

  it('renders failed job polling without fake results', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        json({
          data: {
            id: 'job-1',
            analysisId: 'analysis-1',
            status: 'failed',
            progress: 42,
            attempt: 3,
            maxAttempts: 3,
            nextAttemptAt: '2026-09-17T00:00:00.000Z',
            startedAt: '2026-09-17T00:00:00.000Z',
            finishedAt: '2026-09-17T00:01:00.000Z',
            errorCode: 'CRAWL_FAILED',
            errorMessage: 'Website blocked analysis.',
            updatedAt: '2026-09-17T00:01:00.000Z',
          },
        }),
      ),
    );
    render(<AnalysisDetailView analysisId="analysis-1" jobId="job-1" />);
    expect(await screen.findByText('Analysis failed')).toBeTruthy();
    expect(screen.getByText('Website blocked analysis.')).toBeTruthy();
  });
});
