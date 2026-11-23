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
        name: /Know the business\.\s*Find your angle\.\s*Win better clients\./,
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole('heading', { level: 2, name: /Make the next step\s*make sense\./ }),
    ).toBeTruthy();
    for (const step of ['What you can observe', 'Why it might matter', 'What to explore next'])
      expect(screen.getByRole('heading', { level: 3, name: step })).toBeTruthy();
  });

  it('provides conversion actions and accessible desktop and mobile navigation', () => {
    render(
      <SiteShell>
        <Homepage />
      </SiteShell>,
    );

    expect(
      screen.getAllByRole('link', { name: /Start free|Get started/ }).length,
    ).toBeGreaterThanOrEqual(3);
    expect(screen.getByLabelText('Open navigation menu')).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Mobile navigation' })).toBeTruthy();
    expect(screen.getByRole('contentinfo')).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Product links' })).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Resource links' })).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Company links' })).toBeTruthy();
  });
});
