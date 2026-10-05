# ProspectAI Phase 7 - Database

## Status

The repository-side database hardening is implemented and the complete five-migration chain applies cleanly to a disposable PostgreSQL database. The new migration has not been applied to the configured development database in this run because the environment safety gate blocked a live database mutation. No reset or data deletion was performed.

## Architecture

ProspectAI uses PostgreSQL with Prisma and a dedicated worker. `AnalysisJob` is the durable queue:

`Web/API -> PostgreSQL AnalysisJob -> Worker -> Crawler/Scoring/AI -> PostgreSQL results`

Redis and BullMQ are not runtime dependencies.

The Prisma client is singleton-scoped in development and process-scoped in production. The web process and worker each own their database client lifecycle; the worker disconnects during shutdown.

## Schema Audit

Reviewed all models in `packages/database/prisma/schema.prisma`: users, profiles, organizations, memberships, web/auth/extension sessions, guest sessions, subscriptions, usage, websites, analyses, findings, opportunities, leads, contacts, pitches, activities, jobs, webhook events, audit logs, auth actions, rate-limit buckets, and authorization handoffs.

Existing foreign keys and delete behavior are preserved. User-owned security tokens cascade with their user. Lead contacts and analysis findings/opportunities cascade with their parent. Website links from leads and pitch links are nullable with `SET NULL`. Audit, webhook, and guest conversion references use nullable ownership where historical traceability must survive account deletion.

The application deliberately retains guest provenance after conversion while moving analysis/job ownership to the registered organization. Guest raw-content cleanup excludes converted sessions so converted user results are not deleted by guest maintenance.

## Hardening Implemented

Migration `20261005000000_database_hardening` adds:

- database uniqueness for one lead per organization and website;
- `Pitch(organizationId, updatedAt)` and `Subscription(organizationId, updatedAt)` indexes for real ordering queries;
- a partial claim index for unlocked queued/retry jobs;
- validated positive usage quantities;
- validated score and confidence ranges;
- validated non-negative rate-limit counts;
- validated job attempt bounds and lock-pair consistency.

The migration is additive, uses `NOT VALID` followed by explicit validation, and does not drop, truncate, or rewrite user data.

## Tenant Isolation

All protected API reads and writes are scoped through `requireRequestActor` and `organizationId`. Worker reads and result writes include organization ownership. Guest reads bind to the validated guest session. The invariant audit found zero current mismatches for analysis/website, job/analysis, lead/website, pitch/analysis, pitch/lead, activity/lead, auth-session membership, or extension-session membership.

The schema retains both resource foreign keys and explicit organization ownership. PostgreSQL RLS was not introduced because the current application does not set a per-request database tenant context; application authorization remains authoritative and is covered by integration tests.

## Queue and Concurrency

Claims use `FOR UPDATE SKIP LOCKED`. A lease is fenced by job ID, worker ID, attempt, and non-null lock timestamp. Stale recovery clears the lease and either schedules a bounded retry or releases the reservation on terminal failure.

Worker result persistence now runs inside `withLease`, which locks and verifies the matching job row before findings/opportunities/results are written. This prevents a recovered worker from writing results after losing its lease.

Usage reservation and guest allowance use organization/feature advisory transaction locks, serializable transactions, and database idempotency keys. Queue completion/failure/release operations are idempotent through the usage ledger uniqueness constraint.

## Authentication and Idempotency

Session, extension, guest, authorization-code, webhook-event, and usage identifiers are uniquely indexed. Auth action issuance is serialized per user/action kind. Auth action consumption now uses a compare-and-set update so concurrent consumers cannot both use the same token. Stripe webhook events are persisted by unique provider event ID before processing.

## Sensitive Data

Persisted session, extension, guest, authorization, and auth-action values are hashes. Raw tokens are not logged. Passwords are stored as hashes. Webhook payloads are retained for replay/audit and must be protected by database access controls in production. API keys remain environment configuration and are not stored in these models.

## Lifecycle and Retention

The worker maintenance process expires active guest sessions, purges expired guest raw extracted text, and expires pending/approved extension handoffs. It is idempotent through status predicates. Converted analyses are preserved. Product/legal owners still need to decide long-term retention and deletion policy for registered analysis text, findings, pitches, activities, webhook payloads, and audit logs; no speculative automatic deletion was added.

## Billing

Stripe event IDs are unique. Subscription provider subscription IDs are unique and webhook processing is transactionally idempotent. Organization and plan metadata are accepted only from a verified Stripe event or an existing subscription record. Production webhook replay, retention, and access controls remain deployment concerns.

## Migration and Recovery

Historical migrations remain unchanged in SQL behavior. The applied queue migration file was restored to the exact checksum recorded by the existing development database after a prior comment-only worktree mismatch was detected. The new hardening migration is additive and applies cleanly from zero on the disposable database.

Production requires managed PostgreSQL backups with point-in-time recovery, tested restores, migration backups, controlled deploy ordering, and a documented rollback strategy. Prisma migrations are forward-only for production; rollback means restoring a backup or applying a reviewed compensating migration.

## Performance and Pagination

Tenant-filtered list endpoints use bounded result sizes. Leads currently use page-number pagination with a bounded page size and a count; this is acceptable for V1 but should move to keyset pagination if lead volume becomes operationally large. Analyses, opportunities, pitches, and activities are capped at 100 in their current endpoints. Queue claims, stale recovery, tenant/status filters, and timestamp ordering have supporting indexes.

## Manual Infrastructure Requirements

- Apply migration `20261005000000_database_hardening` to the development database after explicit approval and verify status.
- Configure managed PostgreSQL backups/PITR, monitoring, connection limits/pooling policy, restore drills, and disaster recovery.
- Schedule the existing worker maintenance process and monitor failed/stuck jobs, migration failures, connection failures, and usage inconsistencies.
- Define product/legal retention periods for registered data and webhook/audit records.
