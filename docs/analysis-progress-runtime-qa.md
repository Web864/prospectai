# Analysis Progress Runtime QA

## Scope

This document records the production analysis progress, timeout, failure, and popup recovery contract for ProspectAI V1. The PostgreSQL AnalysisJob queue and dedicated worker remain authoritative; the extension is a polling client.

## Root Cause Found

The worker already emitted truthful status transitions and progress percentages, but the extension:

- stopped after exactly 120 polls, about three minutes;
- converted that limit and polling exceptions into the generic backend-unavailable state;
- forced a fabricated 5% minimum progress bar;
- did not persist the active job for registered analyses;
- did not reliably recover an active job when the popup was closed and reopened.

That made healthy long-running work look unavailable and could encourage duplicate submissions.

## Authoritative Pipeline

The worker reports these real stages through PostgreSQL:

1. queued / validating: preparation
2. fetching / rendering: website retrieval
3. extracting: evidence collection
4. rule_analysis: deterministic website scoring
5. ai_processing: optional AI insight generation
6. opportunity_scoring: opportunity result preparation
7. completed or partial: persisted result
8. failed or cancelled: terminal failure

The API progress contract includes status, progress, attempt, maxAttempts, nextAttemptAt, startedAt, finishedAt, errorCode, errorMessage, and updatedAt.

## Client Behavior

- Polling interval is 1.5 seconds.
- The extension renders the API percentage directly; no artificial minimum is used.
- The UI displays the current stage, Step N of 6, percentage, and elapsed time.
- A long-wait hint appears after one minute without a reported update.
- There is no arbitrary three-minute client timeout.
- A job is classified as stale only when both its last activity and start time exceed the five-minute worker lease threshold.
- Active guest and registered job ID, mode, and start time are stored in minimal chrome.storage.local.
- Popup startup resumes the stored job and fetches its current status.
- Retry after a transient connection/offline/stale state resumes the same job. A new idempotent submission is used only for a terminal failed analysis.

## Failure Classification

- Offline connectivity: offline
- API/session/auth errors: mapped from the typed API error contract
- Malformed progress response: backend_unavailable
- Terminal worker failure: analysis_failed
- Healthy but stale job: analysis_timed_out
- Partial worker result: partial_result

No failure state presents a successful result, and guest usage refreshes after terminal guest outcomes.

## Concurrency and Safety

Submission continues to use an idempotency key. The PostgreSQL queue remains responsible for claiming, locking, retrying, and recovering jobs. The extension does not create a second queue or bypass tenant/guest authorization.

## Verification

Focused extension checks passed after the fix:

- pnpm --filter @prospectai/extension typecheck
- pnpm --filter @prospectai/extension test (13 tests)
- pnpm --filter @prospectai/extension lint
- pnpm --filter @prospectai/extension build

The full repository verification results are recorded in the completion report after execution.

## Manual Verification

Manual Chrome popup verification remains required where browser automation is unavailable. Verify guest and registered analysis states, close/reopen recovery, offline retry, stale-job messaging, partial result, terminal failure, and light/dark rendering in a real Chrome extension context.
