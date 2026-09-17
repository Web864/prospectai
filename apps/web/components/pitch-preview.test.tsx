import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PitchPreview } from './pitch-preview';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('PitchPreview', () => {
  it('keeps evidence and opportunity visible and copies the editable draft', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    render(<PitchPreview />);

    expect(screen.getByText('Evidence')).toBeTruthy();
    expect(screen.getByText('Opportunity')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Edit pitch in ProspectAI' }).getAttribute('href'),
    ).toBe('/app/pitches/new');

    await user.click(screen.getByRole('button', { name: 'Copy illustrative pitch' }));

    expect(writeText).toHaveBeenCalledOnce();
    expect(screen.getByText('Copied')).toBeTruthy();
  });
});
