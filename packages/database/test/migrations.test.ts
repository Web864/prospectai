import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = (name: string) =>
  readFileSync(new URL(`../prisma/migrations/${name}/migration.sql`, import.meta.url), 'utf8');

describe('Prisma migration chain', () => {
  const initial = migration('20260908000000_init');
  const postgresQueue = migration('20260914000000_postgres_analysis_job_queue');

  it('keeps SQL statements outside line comments', () => {
    for (const sql of [initial, postgresQueue]) {
      expect(sql).not.toMatch(/^--[^\r\n]*(?:CREATE|ALTER|DROP)\s+(?:SCHEMA|TYPE|TABLE|INDEX)/m);
    }
  });

  it('creates AnalysisJob before extending it as the PostgreSQL queue', () => {
    expect(initial).toContain('CREATE TABLE "public"."AnalysisJob"');
    expect(initial).toContain('CONSTRAINT "AnalysisJob_pkey" PRIMARY KEY ("id")');
    expect(postgresQueue).toContain('ALTER TABLE "public"."AnalysisJob"');
    expect(postgresQueue).toContain('ADD COLUMN "nextAttemptAt"');
    expect(postgresQueue).toContain('ADD COLUMN "lockedAt"');
    expect(postgresQueue).toContain('ADD COLUMN "lockedBy"');
  });
});
