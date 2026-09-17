# Testing Strategy

## Quality Objective

ProspectAI must prove correctness where the PRD has the highest risk: tenant isolation, extension pairing, URL safety, job/usage accounting, evidence-backed analysis, billing entitlement, and user-visible recovery from external failures. Tests use deterministic fixtures and provider fakes by default; no test may crawl arbitrary internet hosts or call a production AI or payment account.

## Tooling and Environments

- **Unit and component:** Vitest, React Testing Library, and MSW for network boundaries.
- **API and worker integration:** Vitest against a disposable PostgreSQL service through Docker Compose/Testcontainers; Prisma migrations run from an empty database.
- **Browser end-to-end:** Playwright for the web application. Chrome-extension E2E uses a persistent Chromium context with the unpacked Manifest V3 build; CI supplies a virtual display when required.
- **Security and contract checks:** Zod schema tests, dependency and secret scanning in CI, and OWASP-oriented negative test suites.
- **Fixtures:** Versioned HTML pages, redirect chains, robots/noindex cases, JS-rendered fixtures, blocked-host simulations, Stripe event fixtures, and AI provider responses. Fixtures contain synthetic business data only.

Local developer checks must run without external credentials. A `.env.test` file uses only local service endpoints and non-secret test keys. CI uploads only sanitized traces, screenshots, logs, and coverage artifacts.

## Test Layers

| Layer                   | Focus                                                     | Required examples                                                                                                                                                                |
| ----------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Static                  | Types, formatting, linting, dependency and secret hygiene | TypeScript project references, ESLint, formatting check, lockfile integrity, prohibited secret patterns.                                                                         |
| Unit                    | Pure domain behavior                                      | URL normalization, public-IP detection, redirect policy, score calculation, confidence thresholds, token/usage reservation math, job transition state machine, AI output parser. |
| Component               | Interactive UI behavior                                   | Dashboard loading/error/empty states, lead filters, analysis progress, copy/export actions, upgrade and retry states, keyboard access.                                           |
| Integration             | Database, queue, and provider boundaries                  | Prisma migrations, repository tenant scopes, idempotency records, concurrent usage reservation, job retry behavior, evidence persistence, webhook dedupe.                        |
| API contract            | HTTP behavior and authorization                           | Zod validation, error envelope, cursor pagination, IDOR resistance, role controls, rate limit response, cookie/CSRF controls, extension bearer authentication.                   |
| End-to-end              | Critical user outcomes                                    | Register/verify/sign in, pair extension, analyze a valid site, see evidence and score, save lead, generate pitch, review usage, checkout test flow, revoke extension.            |
| Security and resilience | Adversarial and failure conditions                        | SSRF, redirects to private IPs, DNS rebinding simulation, oversized pages, crawl timeouts, AI schema failure, queue outage, payment replay, unauthorized tenant access.          |

## Critical Scenario Matrix

| Product area               | Acceptance scenarios                                                                                                                                                                                                                               |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication and tenancy | Unverified account cannot use protected features; each role is enforced; switching organizations never grants cross-tenant data; session rotation/logout/MFA actions behave correctly.                                                             |
| Chrome extension           | First-use pairing opens an authenticated consent page; PKCE grant exchanges once only; expired or revoked sessions fail safely; popup handles signed-out, loading, blocked, and completed states.                                                  |
| Crawler                    | Canonical public URL succeeds; invalid schemes, credential URLs, localhost, RFC1918/link-local/loopback targets, redirect bypasses, over-limit responses, robots restrictions, and JS-only pages produce the right terminal state and explanation. |
| Jobs and usage             | Duplicate idempotency calls produce one analysis; quota reservation is atomic under concurrency; cancellation and retry never double-charge; terminal failure follows the documented release/adjustment rule.                                      |
| Analysis and AI            | Required opportunity fields are structured, evidence-linked, and confidence labeled; AI output failing schema is retried/falls back without fabricated claims; raw provider errors stay out of user messages.                                      |
| Billing                    | Hosted checkout is owner-only; signed events are deduplicated; plan change updates entitlements; delayed/failed webhook events do not corrupt the ledger.                                                                                          |
| Reporting and privacy      | A shared report exposes only permitted fields; revocation is immediate; API logs and telemetry redact tokens, page content, and PII.                                                                                                               |

## Crawler and Security Test Design

The crawler test suite runs against controlled local servers that emulate DNS responses, HTTP status chains, content types, delays, compressed body limits, and JavaScript rendering. It verifies every redirect hop and resolved address before connection, rechecks final URLs, constrains ports, limits response bytes/time, and never permits a private or link-local target. Playwright rendering tests are limited to approved fixtures and validate resource interception rules.

Authorization tests generate two organizations, users, and records for every tenant-owned resource. Each endpoint is exercised with no session, wrong tenant, wrong role, stale extension token, and valid actor. Payment webhook tests use provider-signed fixture bodies and exact raw-body verification; AI tests assert structured schemas and citations/evidence provenance rather than wording alone.

## CI Gates

Every pull request runs static checks, unit/component tests, API integration tests, migration-from-empty-database validation, and a focused Playwright smoke suite. Protected-branch and release candidates additionally run the extension E2E suite, security regression suite, full browser matrix, coverage reporting, and a production-like deployment smoke test.

The initial quality thresholds are 80% line coverage for shared packages and 90% branch coverage for authorization, usage ledger, job-state, crawler safety, and billing webhook modules. Coverage does not replace scenario tests; an uncovered security-sensitive branch blocks release.

## Release Verification

Before release, validate a fresh-account journey in staging, package and load the exact extension ZIP, submit a signed Stripe test event, run a controlled crawler canary, inspect error redaction, verify alert delivery, and rehearse rollback. Production deployment is blocked by failing migrations, critical/high dependency vulnerabilities without a documented exception, failed tenant isolation tests, or a Chrome Store policy/permission mismatch.

## Test Delivery Sequence

1. Add test infrastructure, local services, fixtures, and static checks with the workspace foundation.
2. Build unit/integration coverage alongside schema, auth, ledger, and job code rather than after it.
3. Add crawler, AI, billing, and extension contract tests as those adapters are introduced.
4. Automate core E2E paths before beta; make the release verification suite mandatory before public launch.
