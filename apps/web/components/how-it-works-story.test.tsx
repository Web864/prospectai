import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { HowItWorksStory } from './how-it-works-story';

afterEach(cleanup);

describe('How it works scroll story', () => {
  it('walks through all seven steps with the first one active', () => {
    render(<HowItWorksStory />);

    const headings = screen.getAllByRole('heading', { level: 3 }).map((node) => node.textContent);
    expect(headings).toEqual([
      'Enter a website',
      'AI research',
      'Detect needs',
      'Match the opportunity',
      'Review insights',
      'Generate the pitch',
      'Go to market',
    ]);
    expect(document.querySelector('.hs-step.is-active h3')?.textContent).toBe('Enter a website');
  });

  it('labels the animated scenes as illustrative and keeps them out of the accessibility tree', () => {
    render(<HowItWorksStory />);

    const stage = document.querySelector('.hs-stage-wrap');
    expect(stage?.getAttribute('aria-hidden')).toBe('true');
    expect(stage?.textContent).toContain('Illustrative example');
  });
});
