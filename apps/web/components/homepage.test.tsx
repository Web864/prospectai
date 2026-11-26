import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Homepage } from './homepage';
import { SiteShell } from './site-shell';

afterEach(cleanup);

describe('ProspectAI homepage', () => {
  it('communicates the research-before-outreach proposition', () => {
    render(<Homepage />);

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Know the business. Find your angle. Win better clients.',
      }),
    ).toBeTruthy();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole('heading', {
        name: 'A better conversation starts before the first message.',
      }),
    ).toBeTruthy();
    expect(screen.getByText('Are the opportunities guaranteed?')).toBeTruthy();
  });

  it('provides conversion actions and independent page navigation', () => {
    render(
      <SiteShell>
        <Homepage />
      </SiteShell>,
    );

    expect(screen.getByRole('link', { name: /Start free/ }).getAttribute('href')).toBe('/signup');
    expect(screen.getByLabelText('Open navigation menu')).toBeTruthy();
    const main = screen.getByRole('navigation', { name: 'Main navigation' });
    const hrefs = within(main)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'));
    expect(hrefs).toEqual(['/how-it-works', '/features', '/pricing', '/resources', '/faq']);
    expect(hrefs.every((href) => !href?.includes('#'))).toBe(true);
    expect(screen.getByRole('navigation', { name: 'Mobile navigation' })).toBeTruthy();
    expect(screen.getByRole('contentinfo')).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Product links' })).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Resource links' })).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Company links' })).toBeTruthy();
  });
});
