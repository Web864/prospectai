import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { FaqPage, FeaturesPage, PricingPage } from './reference-marketing-pages';

afterEach(cleanup);

describe('dedicated marketing pages', () => {
  it('presents evidence, interpretation, and relevant services on Features', () => {
    render(<FeaturesPage />);

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'From website signals to credible sales opportunities',
      }),
    ).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Evidence first' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Commercial interpretation' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Services worth selling' })).toBeTruthy();
  });

  it('keeps pricing choices honest and routes each call to action', () => {
    render(<PricingPage />);

    expect(
      screen.getByRole('heading', { name: 'Start free, scale when prospecting works' }),
    ).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Free' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Pro / Individual' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Agency' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Start free' }).getAttribute('href')).toBe('/signup');
    expect(screen.getAllByRole('link', { name: 'Choose plan' })).toHaveLength(2);
  });

  it('opens FAQ answers with the native keyboard-accessible disclosure', async () => {
    const user = userEvent.setup();
    render(<FaqPage />);

    const question = screen.getByText('What does ProspectAI analyze?');
    const details = question.closest('details');
    expect(details?.open).toBe(false);

    await user.click(question);

    expect(details?.open).toBe(true);
    expect(screen.getByText(/accessible public website pages/)).toBeTruthy();
  });
});
