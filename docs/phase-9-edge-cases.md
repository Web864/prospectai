# ProspectAI Phase 9 - Edge Cases

## Status

Phase 9 is complete against the current repository baseline. Phase 10 has not started. The edge-case audit preserved the guest-first flow, PostgreSQL AnalysisJob queue, tenant isolation, security hardening, and existing product behavior.

## Defects Found And Fixed

### Concurrent extension refresh rotation

Reproduction: two requests used the same valid extension refresh token concurrently. The previous update could let both requests pass the initial lookup and mint competing token pairs, invalidating one response immediately.

Fix: refresh rotation now uses a compare-and-set update requiring the original refresh-token hash, connected status, and non-revoked session. Exactly one concurrent request succeeds; the loser receives the deterministic session-revoked response. Regression: apps/web/app/api/v1/extension/refresh/route.test.ts.

### Transient guest conversion outage

Reproduction: extension pairing succeeded, but the follow-up guest conversion returned a temporary backend failure. The extension became authenticated while retaining guest state that the normal startup path did not retry reliably.

Fix: guest conversion is now retry-safe. Temporary failures retain guest state; a later popup startup or service-worker conversion request retries it. Expired/invalid guest sessions are cleaned up safely. The popup now loads and uses the guest session ID during authenticated recovery. Regression: apps/extension/src/service-worker.test.ts.

### Dependency pin regression during verification

A broad security override selected Effect 4 for Prisma 6.14 and broke Prisma generation. It was corrected to exact patched, Prisma-compatible versions. Final Prisma generation and audit both pass.

## Edge-Case Matrix

| Area                    | Scenarios exercised                                                                                                                                    | Result                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Extension auth          | expired access, revoked access, malformed responses, canceled/failed handoff, duplicate callback, sender validation, concurrent refresh rotation       | PASS                                                                        |
| Guest sessions          | invalid/expired/revoked state, quota exhaustion, duplicate requests, concurrent reservation, failed-job release, transient conversion outage           | PASS                                                                        |
| Offline/backend outage  | extension network failure, polling timeout, retry states, API error mapping                                                                            | PASS                                                                        |
| URL safety              | unsupported schemes, private/metadata targets, blocked domains, DNS private results, redirect to private target                                        | PASS                                                                        |
| Crawler limits          | redirect bounds, timeout, declared/streamed response bounds, malformed HTML, unsupported content types, JS-heavy HTML-only pages                       | PASS; JS execution is intentionally not performed                           |
| Worker/queue            | SKIP LOCKED claiming, stale lease recovery, bounded retries, lease fencing, duplicate completion/failure, worker stop recovery                         | PASS                                                                        |
| Duplicate work          | analysis idempotency, guest idempotency, usage ledger idempotency, duplicate lead/domain protection                                                    | PASS                                                                        |
| AI                      | provider unavailable, timeout boundary, malformed JSON, schema-invalid output, unknown finding IDs, unsupported services, prompt-injection content     | PASS; worker produces a deterministic partial result when AI is unavailable |
| Tenant/user lifecycle   | organization-scoped reads/writes, deleted or missing user/session, cross-tenant resource IDs, deleted leads/analyses                                   | PASS                                                                        |
| Billing                 | owner authorization, invalid callback origins, idempotency keys, signature rejection, duplicate webhook event handling, payment-failure status mapping | PASS in code/tests; live Stripe delivery remains deployment verification    |
| OAuth/PKCE              | tampered state, expired state, invalid verifier, invalid code, replayed authorization code, expired handoff                                            | PASS                                                                        |
| Extension compatibility | invalid version/redirect URI, minimal permissions, missing active tab, unsupported page                                                                | PASS                                                                        |

## Verification

- pnpm lint - PASS
- pnpm typecheck - PASS
- pnpm format:check - PASS
- pnpm test - PASS (39 web tests, 11 extension tests, all workspace suites)
- pnpm prisma:generate - PASS
- pnpm prisma:validate - PASS
- pnpm prisma:migrate:status - PASS; five migrations applied and schema up to date
- pnpm --filter @prospectai/web build - PASS
- pnpm --filter @prospectai/extension build - PASS
- pnpm --filter @prospectai/worker build - PASS
- pnpm audit --prod - PASS; no known vulnerabilities
- git diff --check - PASS

The web build reports the existing non-blocking Next.js ESLint-plugin detection warning. No test or build failure remains.

## External Verification Still Required

These are environment-dependent checks, not unresolved code defects:

- Verify live Chrome popup behavior and permissions in a real Chrome profile.
- Deliver signed Stripe test webhooks and replay them against the deployed HTTPS endpoint.
- Exercise real Google OAuth cancellation, provider outage, and callback behavior with configured credentials.
- Run production crawler probes only against approved public targets with deployment egress monitoring.

## Final Decision

No unresolved Critical or High code defect was found. Phase 9 is complete. Do not start Phase 10 automatically.
