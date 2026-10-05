import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = (name: string) =>
  readFileSync(new URL(`../prisma/migrations/${name}/migration.sql`, import.meta.url), 'utf8');

describe('Prisma migration chain', () => {
  const initial = migration('20260908000000_init');
  const postgresQueue = migration('20260914000000_postgres_analysis_job_queue');
  const guestSessions = migration('20260917000000_value_first_guest_sessions');
  const phaseSix = migration('20260918000000_phase_6_backend');
  const phaseSeven = migration('20261005000000_database_hardening');

  it('keeps SQL statements outside line comments', () => {
    for (const sql of [initial, postgresQueue, guestSessions, phaseSix, phaseSeven]) {
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
  it('adds guest sessions and nullable ownership without deleting existing data', () => {
    expect(guestSessions).toContain('CREATE TABLE "public"."GuestSession"');
    expect(guestSessions).toContain('ADD COLUMN "guestSessionId" TEXT');
    expect(guestSessions).toContain('GuestSession_trialLimit_check');
    expect(guestSessions).not.toMatch(/DROP\s+(?:TABLE|COLUMN|TYPE)/i);
    expect(guestSessions).not.toContain('TRUNCATE');
  });

  it('adds Phase 7 constraints and indexes without destructive operations', () => {
    expect(phaseSeven).toContain('Lead_organizationId_websiteId_key');
    expect(phaseSeven).toContain('AnalysisJob_claimable_partial_idx');
    expect(phaseSeven).toContain('UsageLedger_quantity_check');
    expect(phaseSeven).toContain('WebsiteAnalysis_scores_check');
    expect(phaseSeven).toContain('VALIDATE CONSTRAINT');
    expect(phaseSeven).not.toMatch(/DROP\s+(?:TABLE|COLUMN|TYPE)/i);
    expect(phaseSeven).not.toContain('TRUNCATE');
  });
});
