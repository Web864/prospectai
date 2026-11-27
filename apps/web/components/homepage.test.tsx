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
        name: /Know the business\.\s*Find your angle\.\s*Win better clients\./,
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole('heading', { level: 2, name: /Make the next step\s*make sense\./ }),
    ).toBeTruthy();
    for (const step of ['What you can observe', 'Why it might matter', 'What to explore next'])
      expect(screen.getByRole('heading', { level: 3, name: step })).toBeTruthy();
  });

  it('provides conversion actions and independent page navigation', () => {
    render(
      <SiteShell>
        <Homepage />
      </SiteShell>,
    );

    expect(
      screen.getAllByRole('link', { name: /Start free|Get started/ }).length,
    ).toBeGreaterThanOrEqual(3);
    expect(screen.getByLabelText('Open navigation menu')).toBeTruthy();
    const main = screen.getByRole('navigation', { name: 'Main navigation' });
    const hrefs = within(main)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'));
    expect(hrefs).toEqual([
      '/how-it-works',
      '/features',
      '/pricing',
      '/resources',
      '/blog',
      '/faq',
    ]);
    expect(hrefs.every((href) => !href?.includes('#'))).toBe(true);
    expect(screen.getByRole('navigation', { name: 'Mobile navigation' })).toBeTruthy();
    expect(screen.getByRole('contentinfo')).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Product links' })).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Resource links' })).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Company links' })).toBeTruthy();
  });
});
