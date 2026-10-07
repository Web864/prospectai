import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ThemeToggle } from './theme-toggle';

const storage = new Map<string, string>();

beforeEach(() => {
  storage.clear();
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    },
  });
});

afterEach(() => {
  cleanup();
  storage.clear();
  document.documentElement.dataset.theme = 'light';
});

describe('theme toggle', () => {
  it('switches themes and persists the selected preference', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    const toggle = screen.getByRole('button', { name: 'Use dark theme' });
    expect(toggle.getAttribute('aria-pressed')).toBe('false');

    await user.click(toggle);

    const lightToggle = screen.getByRole('button', { name: 'Use light theme' });
    expect(lightToggle.getAttribute('aria-pressed')).toBe('true');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(storage.get('prospectai-theme')).toBe('dark');
  });
});
