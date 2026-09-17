import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DashboardView, LeadsView, AnalysisView } from './product-views';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('product API states', () => {
  it('renders dashboard loading and real empty activity state', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        json({
          data: {
            analyses: 0,
            leads: 0,
            qualifiedOpportunities: 0,
            contactedProspects: 0,
            replies: 0,
            meetings: 0,
            wonClients: 0,
            analysesUsed: 0,
            analysesLimit: 3,
            plan: 'free',
            extensionConnected: false,
            recentActivity: [],
          },
        }),
      ),
    );
    render(<DashboardView />);
    expect(screen.getByRole('status', { name: 'Loading workspace data' })).toBeTruthy();
    expect(await screen.findByText('No recent activity')).toBeTruthy();
    expect(screen.getByText('Connect Chrome Extension')).toBeTruthy();
  });

  it('renders dashboard backend errors with retry', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(json({ error: { message: 'Unavailable' } }, 503)),
    );
    render(<DashboardView />);
    expect(await screen.findByText('Unable to load this data')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });

  it('keeps non-detail placeholders free of fabricated results', () => {
    render(
      <>
        <LeadsView />
        <AnalysisView />
      </>,
    );
    expect(screen.getByText('Leads are loaded from the workspace API')).toBeTruthy();
    expect(screen.getByText('Choose an analysis')).toBeTruthy();
  });
});
