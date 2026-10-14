import { describe, expect, it } from 'vitest';
import { extensionEnvironment } from './build-environment';

describe('extension deployment configuration', () => {
  it('supports localhost only in an explicitly local build', () => {
    expect(extensionEnvironment('local-development', {})).toEqual({
      appUrl: 'http://localhost:3000',
      apiUrl: 'http://localhost:3000/api/v1',
    });
    expect(() => extensionEnvironment('production', {})).toThrow();
  });
  it.each([
    'http://localhost:3000',
    'https://localhost',
    'https://127.0.0.1',
    'https://127.0.0.2',
    'https://[::1]',
    'http://api.example.org',
  ])('rejects unsafe production origin %s', (origin) => {
    expect(() =>
      extensionEnvironment('production', {
        VITE_APP_URL: 'https://app.example.org',
        VITE_API_BASE_URL: origin + '/api/v1',
      }),
    ).toThrow();
  });
  it('uses exact configured HTTPS origins in production', () => {
    expect(
      extensionEnvironment('production', {
        VITE_APP_URL: 'https://app.example.org',
        VITE_API_BASE_URL: 'https://api.example.org/api/v1/',
      }),
    ).toEqual({ appUrl: 'https://app.example.org', apiUrl: 'https://api.example.org/api/v1' });
  });
});
