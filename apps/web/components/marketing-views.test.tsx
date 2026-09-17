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
      'Visit Website',
      'Analyze',
      'Detect Evidence',
      'Identify Opportunity',
      'Recommend Service',
      'Generate Pitch',
      'Save Lead',
    ]);
    expect(screen.getByText(/Prospect Opportunity Intelligence platform/)).toBeTruthy();
  });

  it('answers the V1 privacy, usage, failure, and outreach questions', () => {
    render(<FaqView />);
    expect(screen.getByText('What data does the Chrome Extension access?')).toBeTruthy();
    expect(screen.getByText('Does ProspectAI monitor all browsing?')).toBeTruthy();
    expect(screen.getByText('How are analyses counted?')).toBeTruthy();
    expect(screen.getByText('Can an analysis partially complete?')).toBeTruthy();
    expect(screen.getByText('Can I edit AI-generated pitches?')).toBeTruthy();
  });
});
