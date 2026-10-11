# PROSPECTAI - ANALYSIS JOB ROOT CAUSE REPORT

## Symptom

One controlled local guest analysis remained queued for hours while the web/API was running. The UI symptom was a queued analysis with no meaningful stage transition.

## Job

- Job ID: cmuzefc6q000gdppwthgcg5zq
- Analysis ID: cmuzefc6k000edppww25vu0jq
- Created: 2026-10-08T10:33:46.611Z
- Initial status: QUEUED

## Database State

Immediately after API submission:

- Status: QUEUED
- Attempt: 0 of 3
- Lease: unlocked; lockedAt and lockedBy were null
- Next attempt: due immediately
- Progress: 0
- Stage: none; startedAt and finishedAt were null
- Error: none

A read-only claim-predicate check returned due=true, unlocked=true, and attempts_available=true. The API transaction committed the row before returning 202, and the row was visible to PostgreSQL immediately.

## Worker

Before diagnosis, the worker process was not running. The web process was running on port 3000 and PostgreSQL was running on localhost:5432.

After starting exactly one dedicated worker:

- worker_ready logged successfully;
- the worker connected to PostgreSQL;
- zero abandoned jobs were recovered;
- the exact job was claimed at attempt 1;
- bounded retries proceeded through attempt 3.

Web/API, worker, and Prisma use the same root .env loading convention and effective database target:

- protocol: postgresql
- host: localhost
- port: 5432
- database: prospectai
- schema: public

No credentials are included.

## API

- Submission endpoint: POST /api/v1/guest-analyses
- Authorization: valid guest session
- Usage reservation: completed
- Analysis and AnalysisJob creation: one serializable PostgreSQL transaction
- Commit: completed before the 202 response
- Returned status: queued

No tenant or guest scope mismatch was found.

## Queue

The claim query requires:

- status QUEUED or RETRY_PENDING;
- nextAttemptAt due;
- lockedAt null;
- attempt less than maxAttempts;
- ordering by nextAttemptAt and createdAt;
- FOR UPDATE SKIP LOCKED;
- one-row atomic transition to VALIDATING or RETRYING;
- lockedBy, lockedAt, attempt, and startedAt lease fields.

The controlled job satisfied every condition. The queue claim index and database hardening migration were present, and all five migrations were applied.

## First Broken Transition

API -> Database: PASS

Database -> Queue claim: PASS when a worker exists

Queue claim -> Worker: BROKEN before diagnosis because no worker process was running

After worker startup:

Worker -> Crawler: reached

Crawler -> Evidence: blocked by crawler timeout in this environment

Evidence -> Scoring: not reached for this controlled URL

AI -> Result persistence: not reached for this controlled URL

## Root Cause

The queued symptom was caused by an operational runtime gap: the web/API process was running without the required dedicated PostgreSQL worker process. The API correctly committed claimable jobs, but no process was polling and claiming them.

The repository already has the correct local stack commands:

- pnpm dev starts web, extension, and worker;
- pnpm dev:web starts only web/API;
- pnpm dev:worker starts the dedicated worker.

The failing local state was produced by running only the web process.

A secondary queue correctness issue was found during diagnosis. PostgreSQL reports Asia/Karachi as its session timezone while Prisma Date values are handled as UTC-naive database timestamps. Raw queue SQL used CURRENT_TIMESTAMP directly, which could skew lease timestamps and delay stale-job recovery. Raw queue timestamps and stale comparisons now explicitly normalize to UTC.

## Fix

- Started the required dedicated worker process for the local runtime.
- Did not change frontend timeout or progress behavior.
- Did not create a second queue or modify database rows manually.
- Normalized raw queue SQL timestamps to UTC with AT TIME ZONE 'UTC'.
- Added queue regression assertions for UTC claim and stale-lease expressions.

The queued-state root cause is fixed by running the approved web plus worker processes. No API, tenant, usage, or claim predicate defect was found.

## Regression Tests

- PostgreSQL queue tests: PASS, 17 tests
- Full repository tests: PASS, including 40 web tests and 13 extension tests
- Queue claim and stale-lease SQL assertions: PASS
- Lint: PASS
- Typecheck: PASS
- Format check: PASS
- Prisma generate: PASS
- Prisma validate: PASS
- Prisma migration status: PASS; five migrations applied
- Web build: PASS
- Extension build: PASS
- Worker build: PASS
- Production audit: PASS; no known vulnerabilities
- Git diff check: PASS

## Live Runtime Verification

- Web/API running at http://localhost:3000
- One worker process running and logged worker_ready
- Controlled job: QUEUED -> VALIDATING -> FETCHING -> RETRY_PENDING -> retry -> FAILED after maxAttempts
- Claim lease fields and attempts changed as expected
- Duplicate worker processes were not left running
- Crawler returned ANALYSIS_TIMEOUT for example.com in this local environment; this is downstream of the queue fix
- Real Chrome popup reopen and final result verification unavailable because browser automation is unavailable

## Remaining Manual Requirements

- Run one real Chrome extension analysis with web and worker both running.
- Verify popup close/reopen resumes the same active job.
- Verify a reachable test site completes through result persistence.
- Confirm the local crawler/network environment permits the target website.

## Final Decision

BLOCKED BY ENVIRONMENT

The queued-state root cause is identified and fixed. Full end-to-end completion could not be declared because the controlled crawler request timed out in this environment and real Chrome automation was unavailable.

## Successful End-to-End Verification

This section records the single permitted live analysis attempt. It was not successful because the crawler transport defect was discovered after the job had already exhausted its bounded retries.

Job ID: cmuzfd7yb000adpqc7rpz97x2
Target: https://www.iana.org/domains/example
Worker: Dev-x-18720 during the recorded attempt; one healthy worker is running now as Dev-x-20864
Start time: 2026-10-08T11:00:05.839Z
Completion time: 2026-10-08T11:00:56.630Z

QUEUED: PASS
VALIDATING: PASS (worker claim at attempt 1)
FETCHING: PASS (crawler stage reached; progress 15)
EVIDENCE: FAIL - the pinned crawler request timed out before retrieval
SCORING: NOT REACHED
AI: NOT REACHED
RESULT PERSISTENCE: FAIL - the job ended FAILED and no completed result was produced
API RESULT: FAIL - no completed result was available to return
EXTENSION RESULT: BLOCKED - browser automation was unavailable, and the job did not produce a result

Progress: PASS for real queue progress and bounded retry state; FAIL for completed end-to-end progress
Popup close/reopen: BLOCKED - Chrome/browser automation unavailable
Retry: PASS - automatic bounded retries were observed on attempts 1, 2, and 3; manual retry was not performed
Chrome: BLOCKED

## Additional Fix Found During Verification

The reachable IANA target returned a valid redirect and final HTTP 200 response in direct transport checks, but `fetchPinned` did not call `request.end()` after constructing the Node HTTP(S) request. That caused the application crawler to wait until `ANALYSIS_TIMEOUT`. The crawler now explicitly ends the pinned request, consumes bounded redirect bodies before following redirects, and maps the existing AbortSignal to request destruction without passing the signal directly to Node transport. Crawler regression tests and a direct crawl of the same target now pass.

A second live analysis was intentionally not created because this verification request required exactly one analysis.

## Final End-to-End Decision

BLOCKED BY ENVIRONMENT

The original queued-worker root cause and the crawler transport defect are fixed and verified in code. A successful persisted result and Chrome display could not be verified within the single-analysis constraint because the only live job failed before the crawler fix and browser automation was unavailable.
