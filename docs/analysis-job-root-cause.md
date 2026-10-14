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

## Prior End-to-End Attempt (2026-10-08)

This section records the single permitted live analysis attempt. It was not successful because the crawler transport defect was discovered after the job had already exhausted its bounded retries.

Job ID: cmuzfd7yb000adpqc7rpz97x2
Target: https://www.iana.org/domains/example
Worker: Dev-x-18720 during that historical attempt
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

## Successful End-to-End Verification

The single live analysis required for the 2026-10-12 verification did not complete. It confirmed the crawler and scoring stages, then exposed a PostgreSQL identifier-quoting defect during lease-protected result persistence. That SQL defect has been fixed and covered by the queue regression test, but no second live analysis was submitted, so the fix has not been reverified end-to-end.

Job ID: cmv4u6gog000adp2suhzbqnke
Analysis ID: cmv4u6gnv0008dp2ssp45n0od
Target: https://www.iana.org/
Worker: Dev-x-21084 for the live job; exactly one worker runtime was active. The watch process restarted once after the SQL fix and reported ready as Dev-x-8980.
Start time: 2026-10-12T05:53:32.598Z
Completion time: 2026-10-12T05:53:45.581Z

QUEUED: PASS (API accepted 202 with queued; PostgreSQL row observed at progress 0)
VALIDATING: PASS (worker claimed the same job at attempt 1)
FETCHING: PASS (crawler stage reached; API and PostgreSQL progress observed)
EVIDENCE: PASS (page extraction reached; PostgreSQL recorded EXTRACTING)
SCORING: PASS (worker advanced to OPPORTUNITY_SCORING at progress 90)
AI: FAIL (configured, but worker logged AI_UNAVAILABLE on each attempt)
RESULT PERSISTENCE: FAIL (lease query failed because unquoted AnalysisJob resolved as lowercase analysisjob; fix applied and queue tests pass, but not live-retested)
API RESULT: FAIL (result endpoint returned the failed analysis state with no persisted score or evidence)
EXTENSION RESULT: BLOCKED (no completed result was available, and the current build did not load into Chrome)

Progress: PASS for real API stages, progress values, timestamps, and elapsed-time basis; no generic service-unavailable response was observed while the worker was healthy. The popup's visual progress was not verified.
Popup close/reopen: BLOCKED (the ProspectAI extension was absent from Chrome's loaded extensions)
Retry: PASS (the genuine persistence failure triggered bounded automatic retries on the same job; PostgreSQL contains exactly one job for this analysis, with no manual retry)
Chrome: BLOCKED (production extension build passed, but Chrome did not load the unpacked build; popup/result display and close/reopen recovery were not testable)

Crawler: PASS (www.iana.org resolved; direct crawler retrieval returned HTTP 200 HTML and extracted page text/headings)
Worker health: PASS during the live job (worker_ready, job claim, three attempts, and terminal failure were logged). Web and worker were stopped after the run to release Prisma's Windows query-engine DLL for the requested Prisma generation check; PostgreSQL remains running.

### Persistence fix found by the live run

`withLease` used unquoted mixed-case PostgreSQL table and column identifiers. PostgreSQL folded `AnalysisJob` to `analysisjob`, producing error 42P01 before result persistence. The table and identifiers are now quoted, and the PostgreSQL queue test asserts the quoted SQL. All 17 analysis-package tests pass. The single-live-analysis limit was respected; the corrected path awaits a future authorized live verification.

### Requested final checks

- `pnpm lint`: PASS
- `pnpm typecheck`: PASS
- `pnpm format:check`: PASS
- `pnpm test`: PASS (107 tests)
- `pnpm prisma:generate`: PASS (after stopping the web and worker processes that held the Windows query-engine DLL)
- `pnpm prisma:validate`: PASS
- `pnpm prisma:migrate:status`: PASS (five migrations applied)
- `pnpm --filter @prospectai/web build`: PASS
- `pnpm --filter @prospectai/extension build`: PASS
- `pnpm --filter @prospectai/worker build`: PASS
- `pnpm audit --prod`: PASS (no known vulnerabilities)
- `git diff --check`: PASS after the report update

## Final End-to-End Decision (2026-10-12)

ANALYSIS STILL REQUIRES FIXES

The newly discovered persistence SQL bug is fixed and regression-tested, but the one live analysis failed before producing a result, the configured AI provider was unavailable, and Chrome did not load the extension. No second analysis or Phase 13 work was started.

## Fresh Persistence Verification (2026-10-12)

The corrected lease-protected persistence path was verified with one fresh analysis. No duplicate job or manual retry was created.

Job ID: `cmv4v3sw6000adpi8b1cr7c00`
Analysis ID: `cmv4v3svx0008dpi8yk9g5s7m`
Target: `https://www.iana.org/domains/example`
Worker: `Dev-x-17392`
Start time: `2026-10-12T06:19:30.4202774Z`
Completion time: `2026-10-12T06:19:35.704Z`

QUEUED: PASS
VALIDATING: PASS - worker claimed attempt 1 and acquired the lease
FETCHING: PASS - reachable IANA page retrieved through the crawler
EVIDENCE: PASS - four evidence-backed findings persisted
SCORING: PASS - website score and opportunity scoring completed
AI: PARTIAL - provider returned `AI_UNAVAILABLE`; no AI output was fabricated
RESULT PERSISTENCE: PASS - the corrected quoted PostgreSQL identifiers allowed terminal result persistence
API RESULT: PASS - guest result endpoint returned HTTP 200
DATABASE/API PROJECTION MATCH: PASS - id, company name, domain, opportunity score, reasoning, key signals, next action, and status matched exactly
EXTENSION RESULT: BLOCKED - Chrome loaded the page target, but no extension service-worker or popup target was exposed; browser automation is unavailable

The worker reached terminal `PARTIAL` with progress 100, attempt 1, and no lock remaining. The persisted aggregate `WebsiteAnalysis.opportunityScore` was 84; the guest API intentionally exposes the highest persisted opportunity score, 98. The API value matched its corresponding persisted `Opportunity` record exactly, so this is an intentional projection rather than a persistence mismatch.

Progress: PASS - real timestamps and terminal progress were persisted; no false percentage was used.
Popup close/reopen recovery: BLOCKED - extension popup automation was unavailable.
Retry: NOT TESTED - the job was healthy and was not retried.
Chrome: BLOCKED - `BROWSER AUTOMATION UNAVAILABLE`; extension build passed, but popup/result verification could not be completed.

## Current Decision

ANALYSIS STILL REQUIRES FIXES

The persistence defect is fixed and live-verified. Full end-to-end completion remains blocked by external AI provider availability and Chrome popup automation, not by the PostgreSQL queue or result persistence path.
