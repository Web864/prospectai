import { describe, expect, it } from 'vitest';
import {
  loadAiEnvironment,
  loadDatabaseEnvironment,
  loadServerEnvironment,
  loadWorkerEnvironment,
} from '../src/index';

describe('process-scoped environment validation', () => {
  it('allows the base server runtime to boot without feature integrations', () => {
    expect(loadServerEnvironment({})).toEqual({ NODE_ENV: 'development' });
  });

  it('requires PostgreSQL only for database operations', () => {
    expect(() => loadDatabaseEnvironment({})).toThrow();
    expect(
      loadDatabaseEnvironment({ DATABASE_URL: 'postgresql://user:password@localhost:5432/app' }),
    ).toMatchObject({ NODE_ENV: 'development' });
  });

  it('uses PostgreSQL as the worker infrastructure dependency', () => {
    expect(() => loadWorkerEnvironment({})).toThrow();
    expect(
      loadWorkerEnvironment({
        DATABASE_URL: 'postgresql://user:password@localhost:5432/app',
        WORKER_POLL_INTERVAL_MS: '250',
      }),
    ).toMatchObject({
      NODE_ENV: 'development',
      WORKER_POLL_INTERVAL_MS: 250,
      WORKER_LOCK_TIMEOUT_MS: 300_000,
    });
  });

  it('validates AI credentials only when the AI integration is invoked', () => {
    expect(() => loadAiEnvironment({})).toThrow();
  });
});
