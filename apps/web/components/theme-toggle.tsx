'use client';

import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  try {
    window.localStorage.setItem('prospectai-theme', theme);
  } catch {
    // Storage may be unavailable in privacy-restricted contexts.
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem('prospectai-theme');
    } catch {
      stored = null;
    }
    const nextTheme: Theme = stored === 'dark' ? 'dark' : 'light';
    setTheme(nextTheme);
    applyTheme(nextTheme);
  }, []);

  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      className="theme-toggle"
      type="button"
      aria-label={nextTheme === 'dark' ? 'Use dark theme' : 'Use light theme'}
      aria-pressed={theme === 'dark'}
      title={nextTheme === 'dark' ? 'Use dark theme' : 'Use light theme'}
      onClick={() => {
        setTheme(nextTheme);
        applyTheme(nextTheme);
      }}
    >
      {theme === 'dark' ? (
        <Sun size={17} aria-hidden="true" />
      ) : (
        <Moon size={17} aria-hidden="true" />
      )}
      <span className="sr-only">{nextTheme === 'dark' ? 'Use dark theme' : 'Use light theme'}</span>
    </button>
  );
}
