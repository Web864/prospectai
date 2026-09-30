import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { FaqView, HowItWorksView } from './marketing-views';

afterEach(cleanup);

describe('ProspectAI marketing compositions', () => {
  it('shows the complete opportunity intelligence workflow in order', () => {
    render(<HowItWorksView />);
    const steps = screen
      .getAllByRole('listitem')
      .map((item) => item.querySelector('h3')?.textContent);
    expect(steps).toEqual([
      'Enter Website',
      'AI Research',
      'Detect Needs',
      'Match Opportunity',
      'Review Insights',
      'Generate Pitch',
      'Go to Market',
    ]);
    expect(screen.getByText(/Prospect Opportunity Intelligence platform/)).toBeTruthy();
  });

  it('answers the V1 privacy, usage, failure, and outreach questions', () => {
    render(<FaqView />);
    expect(screen.getByText('What is ProspectAI?')).toBeTruthy();
    expect(screen.getByText('What types of businesses can I analyze?')).toBeTruthy();
    expect(screen.getByText('How does the opportunity scoring work?')).toBeTruthy();
    expect(screen.getByText('Can I use this for multiple industries?')).toBeTruthy();
    expect(screen.getByText('Do you offer a free plan?')).toBeTruthy();
  });
});
