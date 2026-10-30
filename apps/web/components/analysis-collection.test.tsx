import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AnalysisCollection } from './analysis-collection';
import { BillingView, OpportunitiesView, UsageView } from './workspace-views';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const analyses = [
  {
    id: 'a',
    domain: 'alpha.test',
    status: 'completed' as const,
    websiteScore: 0,
    opportunityScore: 0,
    createdAt: '2026-10-01T00:00:00.000Z',
  },
  {
    id: 'b',
    domain: 'beta.test',
    status: 'partial' as const,
    websiteScore: 62,
    opportunityScore: null,
    createdAt: '2026-10-02T00:00:00.000Z',
  },
  {
    id: 'c',
    domain: 'gamma.test',
    status: 'failed' as const,
    websiteScore: null,
    opportunityScore: null,
    createdAt: '2026-10-03T00:00:00.000Z',
  },
];
const respond = (data: unknown) =>
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(
      async () =>
        new Response(JSON.stringify({ data }), {
          headers: { 'Content-Type': 'application/json' },
        }),
    ),
  );

describe('real-data dashboard collections', () => {
  it('derives counts, preserves zero scores and distinguishes partial results', () => {
    render(<AnalysisCollection analyses={analyses} />);
    expect(screen.getByLabelText('Analysis metrics').textContent).toContain('Total analyses3');
    const row = screen.getByText('alpha.test').closest('tr')!;
    expect(within(row).getAllByText('0')).toHaveLength(2);
    expect(
      within(screen.getByText('beta.test').closest('tr')!).getByText('partial').className,
    ).toContain('warning');
    expect(
      within(screen.getByText('gamma.test').closest('tr')!).getByText('failed').className,
    ).toContain('danger');
  });
  it('filters and resets loaded records using keyboard-accessible controls', async () => {
    const user = userEvent.setup();
    render(<AnalysisCollection analyses={analyses} />);
    await user.click(screen.getByRole('button', { name: 'Completed' }));
    expect(screen.queryByText('gamma.test')).toBeNull();
    await user.type(screen.getByRole('searchbox', { name: 'Search websites' }), 'missing');
    expect(screen.getByText('No analyses match these filters')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByText('gamma.test')).toBeTruthy();
    await user.selectOptions(screen.getByLabelText('Analysis order'), 'oldest');
    expect(screen.getAllByRole('row')[1]?.textContent).toContain('alpha.test');
  });
  it('offers research when the API returns no analyses', () => {
    render(<AnalysisCollection analyses={[]} />);
    expect(screen.getByRole('link', { name: 'Research a website' }).getAttribute('href')).toBe(
      '/app/research',
    );
    expect(screen.getByRole('table')).toBeTruthy();
    expect(screen.getAllByRole('row')).toHaveLength(1);
    expect(screen.getByRole('columnheader', { name: 'Website score' })).toBeTruthy();
  });
  it('renders authoritative usage instead of sample percentages and dates', async () => {
    respond({
      plan: 'free',
      used: 2,
      limit: 8,
      remaining: 6,
      periodStart: '2026-10-01T00:00:00.000Z',
      periodEnd: '2026-11-01T00:00:00.000Z',
      quotaReached: false,
    });
    render(<UsageView />);
    expect(await screen.findByText('25% used')).toBeTruthy();
    expect(screen.queryByText('13 days')).toBeNull();
    expect(screen.getByText('8 total')).toBeTruthy();
  });
  it('does not replace a zero opportunity score with fabricated priority', async () => {
    respond([
      {
        id: 'o',
        analysisId: 'a',
        title: 'Review contact path',
        serviceCategory: 'conversion',
        opportunityScore: 0,
        confidence: 0.5,
        domain: 'alpha.test',
      },
    ]);
    render(<OpportunitiesView />);
    expect(await screen.findByText('Review contact path')).toBeTruthy();
    expect(screen.getByText('Review opportunity')).toBeTruthy();
    expect(screen.queryByText('70')).toBeNull();
    expect(screen.getByText('Confidence: 50%')).toBeTruthy();
  });
  it('shows the real subscription state, not sample billing usage', async () => {
    respond({ plan: 'free', status: 'past_due', currentPeriodEnd: null, cancelAtPeriodEnd: false });
    render(<BillingView />);
    expect(await screen.findByText('past due')).toBeTruthy();
    expect(screen.queryByText('of 10 included')).toBeNull();
    expect(screen.getByRole('link', { name: 'View usage and allowances' })).toBeTruthy();
  });
});
