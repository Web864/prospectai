# ADR 0002: PostgreSQL-Backed Analysis Job Queue

Status: Accepted

## Context

ProspectAI V1 is free-first and already requires PostgreSQL for tenant data, usage accounting, analyses, and results. Operating Redis and BullMQ would add a second stateful infrastructure dependency before V1 workload requires it.

## Decision

The `AnalysisJob` table is the durable asynchronous queue. The web/API creates the analysis, usage reservation, and job in one serializable PostgreSQL transaction. A separate worker process polls due jobs and claims one atomically with `FOR UPDATE SKIP LOCKED`.

Claims use `lockedAt`, `lockedBy`, and the incremented `attempt` as a lease fence. Every progress or terminal update must match all three values, preventing an expired worker from overwriting a job reclaimed by another worker. Workers refresh `lockedAt` while processing. Stale active jobs return to `RETRY_PENDING`, or become `FAILED` when `maxAttempts` is exhausted.

Retries are bounded and scheduled through `nextAttemptAt` with capped exponential delay. Job status and progress remain in PostgreSQL, and authenticated web or extension clients poll `GET /api/v1/analysis-jobs/:jobId` for canonical state.

Usage capacity is serialized per organization and feature with a transaction-scoped PostgreSQL advisory lock. The reservation and job are created atomically and idempotently. Completion consumes the reservation; terminal failure or exhausted recovery releases it.

## Consequences

- PostgreSQL is the only V1 stateful infrastructure dependency.
- The worker remains independently deployable and horizontally safe for the expected V1 workload.
- Polling introduces modest database traffic, controlled by configurable intervals and indexed due-job queries.
- Legacy nullable BullMQ metadata columns are retained under deprecated Prisma names for a non-destructive migration. Runtime code never reads or writes them.
- A dedicated queue service can be reconsidered only when measured throughput or operational evidence justifies it.
