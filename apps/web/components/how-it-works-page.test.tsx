import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { HowItWorksPage } from './how-it-works-page';

afterEach(cleanup);

describe('How It Works page', () => {
  it('renders the complete prospect-to-pitch workflow in order', () => {
    render(<HowItWorksPage />);

    const steps = screen
      .getByRole('list', { name: 'Prospect-to-pitch workflow' })
      .querySelectorAll('[role="listitem"]');
    expect(Array.from(steps, (step) => step.querySelector('h3')?.textContent)).toEqual([
      'Visit Website',
      'Analyze',
      'Detect Evidence',
      'Identify Opportunity',
      'Recommend Service',
      'Generate Pitch',
      'Save Lead',
    ]);
  });

  it('keeps the workflow grounded in real product boundaries', () => {
    render(<HowItWorksPage />);

    expect(screen.getByText('From a live website to a qualified lead')).toBeTruthy();
    expect(screen.getByText('Chrome Extension')).toBeTruthy();
    expect(screen.getByText('Generate editable pitch')).toBeTruthy();
    expect(screen.getByText('Illustrative example')).toBeTruthy();
    expect(screen.getByText('Evidence stays factual')).toBeTruthy();
    expect(screen.getByText('Meaning stays reasoned')).toBeTruthy();
    expect(screen.getByText('Opportunity stays relevant')).toBeTruthy();
  });
});
