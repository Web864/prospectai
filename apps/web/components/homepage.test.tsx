import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Homepage } from './homepage';
import { SiteShell } from './site-shell';

afterEach(cleanup);

describe('ProspectAI homepage', () => {
  it('communicates the evidence-first opportunity intelligence proposition', () => {
    render(<Homepage />);

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Know what service to sell before you write the first message.',
      }),
    ).toBeTruthy();
    expect(screen.getAllByText('Evidence').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Interpretation').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Opportunity').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Website Score').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Opportunity Score').length).toBeGreaterThan(0);
    expect(screen.getByText('No automatic outreach in V1')).toBeTruthy();
  });

  it('provides conversion actions and accessible desktop and mobile navigation', () => {
    render(
      <SiteShell>
        <Homepage />
      </SiteShell>,
    );

    expect(screen.getAllByRole('link', { name: /Start analyzing/ }).length).toBe(2);
    expect(screen.getByLabelText('Open navigation menu')).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Mobile navigation' })).toBeTruthy();
  });
});
