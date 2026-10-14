# PROSPECTAI - PRODUCTION LAUNCH READINESS

Audit date: 2026-10-12

## Recommended Architecture

Web: Next.js 15 App Router on Vercel.
API: Next.js Route Handlers on Vercel.
Database: Managed PostgreSQL. Neon is the preferred candidate for evaluation because it preserves PostgreSQL/Prisma compatibility; no provider switch is authorized by this audit.
Queue: Existing PostgreSQL `AnalysisJob` queue. Do not add Redis, BullMQ, Vercel Queues, or Vercel Workflows for V1.
Worker: Dedicated persistent Node.js worker on Render, Fly.io, Railway, or equivalent supervised service.
Crawler: `HttpFirstCrawler` in the worker only.
AI: OpenAI adapter behind the existing provider abstraction, with deterministic/partial fallback.
Extension: Manifest V3 build released separately with production API and app URLs.

## Why This Architecture

The repository already contains PostgreSQL jobs, lease fencing, `FOR UPDATE SKIP LOCKED`, stale recovery, retries, usage reservation, idempotency, and tenant isolation. Preserving these tested assets is lower launch risk than introducing a second queue. The worker is a persistent process and must not be deployed as a Vercel request function: it polls continuously, runs outbound crawling/AI, renews leases, recovers abandoned jobs, and handles graceful shutdown.

Option A (Vercel web/API + managed PostgreSQL + persistent worker) is recommended over a queue migration. It preserves current behavior, keeps crawler execution out of request functions, and minimizes rollback risk.

## Vercel Compatibility

Status: PASS WITH CONDITIONS.

Next.js 15 App Router, Route Handlers, dynamic routes, server components, and the local production build are compatible. The web request path does not require filesystem access or child processes. Prisma requires a production-compatible pooled database connection strategy. Crawler and worker execution are correctly separated.

No `vercel.json`, function `maxDuration`, production region, preview project, or production environment configuration is present. Current security headers include nosniff, Referrer-Policy, X-Frame-Options, and Permissions-Policy, but no CSP or HSTS policy is configured. These must be decided before production.

## Database

Provider: Local development currently uses PostgreSQL on localhost; production provider is not configured. Neon is the recommended first evaluation, subject to region, pooled runtime URL, direct migration URL, backups, and PITR verification.
Region: Not configured.
Pooling: Required for Vercel runtime. Use pooled runtime access and direct migration access where the provider requires it.
Backups/PITR: Not verified for production.
Migration: Five migrations exist and local status is up to date. Production must use `prisma migrate deploy`; never use `migrate reset` or `db push` against production.

Migrations:

1. `20260908000000_init`
2. `20260914000000_postgres_analysis_job_queue`
3. `20260917000000_value_first_guest_sessions`
4. `20260918000000_phase_6_backend`
5. `20261005000000_database_hardening`

Migration tests cover ordering and non-destructive hardening. Production target verification remains required.

## Worker

Provider: Not selected.
Runtime: Node.js 22+ via `apps/worker`.
Auto restart: Must be supplied by the hosting service.
Health: Structured `worker_ready`, shutdown, claim, completion, retry, failure, and recovery logs exist. No external heartbeat or worker health endpoint is configured.
Queue: PostgreSQL `AnalysisJob` with progress, leases, fencing, retries, idempotency, and stale recovery.
Recovery: Startup/periodic recovery and lease heartbeats are implemented.

Production requires process supervision, automatic restart, log collection, missing-heartbeat alerts, oldest-queued-job age, failed-job count, and database connectivity alerts.

## Environment Matrix

### LOCAL

- Database: configured; localhost development PostgreSQL.
- Web/API/extension URLs: configured for localhost.
- Guest/worker settings: configured.
- OpenAI: configured locally; value not displayed.
- Google OAuth: missing locally.
- Stripe: placeholder or missing locally.
- Resend: missing locally.
- Session/extension secret fields: local configuration includes placeholder values that must not be used for deployment.

### PREVIEW

Not configured or verified. It requires a separate database, non-local URLs, preview OAuth callback, test Stripe configuration, email configuration if tested, AI configuration or explicit partial mode, and a separately running preview worker.

### PRODUCTION

Not configured or verified. It requires managed PostgreSQL, pooled/direct database access, strong secrets, Google OAuth, Stripe, Resend, OpenAI, worker supervision, monitoring, and production extension URLs.

No secret values were printed.

## Authentication

Status: CODE FOUNDATION PASS; PRODUCTION CONFIGURATION NOT VERIFIED.

Password auth, sessions, logout, Google OAuth state, PKCE extension pairing, guest sessions, guest conversion, token hashing, expiry, revocation, replay protection, and tenant predicates are implemented and tested. Cookies use HttpOnly, SameSite=Lax, and production Secure behavior. Production/preview callback URLs, HTTPS, credentials, and live OAuth verification remain manual.

## Billing

Status: CODE FOUNDATION PASS; EXTERNAL CONFIGURATION NOT VERIFIED.

Checkout, portal, callback-origin validation, Stripe signature verification, subscription mapping, and webhook idempotency exist. Products, prices, endpoint URL, mode, and signing secret require external configuration and test-mode verification.

## Email

Status: CODE FOUNDATION PRESENT; PRODUCTION SENDER NOT VERIFIED.

Resend integration and development fallback exist. A verified sender domain, `EMAIL_FROM`, provider selection, API key, and failure monitoring are required.

## Crawler

Status: CODE PASS AFTER FIX; PRODUCTION NETWORK VERIFICATION REQUIRED.

The crawler validates HTTP(S), blocks private/metadata IPs, resolves before connecting, pins requests, preserves TLS SNI, bounds redirects and response size, validates content type, handles malformed HTML, and enforces timeouts. Verification found and fixed a missing `request.end()` in the pinned Node transport; redirect bodies are consumed before following redirects and regression coverage passes. Worker egress, DNS, TLS, and legitimate-target reachability must be verified in preview and production.

## AI

Status: CODE FOUNDATION PASS; PROVIDER/COST CONFIGURATION NOT VERIFIED.

OpenAI calls have a timeout, bounded inputs, JSON output, schema validation, malformed-output handling, and untrusted website-content instructions. Worker AI failures degrade to controlled partial analysis rather than stuck jobs. Production still needs provider credentials, rate/cost limits, monitoring, and outage tests.

## Extension

Production API URL: Not configured.
Production app URL: Not configured.
Current generated artifact: contains `http://localhost:3000/*` because it was built from local configuration.
Status: BLOCKED until a clean production build is generated with production `VITE_API_BASE_URL` and `VITE_APP_URL`, then scanned for localhost/127.0.0.1.

Manifest permissions are limited to `activeTab`, `storage`, and `identity`; no `<all_urls>` permission was found. CSP disallows remote scripts. Chrome Web Store and interactive popup verification remain manual.

## Observability

Status: PARTIAL.

Structured logs and `/api/health/live` exist. Missing production configuration includes worker heartbeat/availability alerts, queue age/failure metrics, database alerts, crawler/AI metrics, Stripe webhook alerts, Vercel log alerts, and incident/recovery runbooks.

## Security

Status: PARTIAL; production gate blocked.

Tenant checks, guest token hashing, PKCE, Stripe signatures, SSRF protections, limited extension permissions, and no Redis/BullMQ runtime dependency were verified. CSP/HSTS, CORS/extension-origin behavior, secure production cookies, current tracked-file/bundle secret scanning, and deployment log redaction require final production review.

## Preview Deployment

URL: Not deployed.
Tests: Not run against Vercel Preview.
Result: BLOCKED pending preview infrastructure, variables, worker, and browser QA.

Required routes: `/`, `/pricing`, `/login`, `/signup`, `/app`, `/app/research`, `/app/analyses`, `/app/leads`, `/app/settings`, `/api/health/live`, plus auth, theme, responsive, console, and runtime-log checks.

## Production Deployment

URL: Not configured.
Status: BLOCKED. No production domain, SSL, database, worker, OAuth, Stripe, Resend, or extension release has been verified.

## Real End-to-End Test

Job: `cmuzfd7yb000adpqc7rpz97x2` was persisted locally.
Queue: PASS for queued, claim, lease, retries, and terminal failure.
Worker: PASS locally; exactly one worker ran and logged readiness.
Crawler: The job ran before the transport fix; the same reachable IANA target succeeds in direct post-fix verification.
AI: Not reached for the recorded job.
Result: FAIL; no completed result persisted.
Extension: BLOCKED; browser automation unavailable and no completed result existed.

A second job was not created because the verification request required exactly one analysis.

## Release Gates

- Supervised persistent worker: FAIL until provider/restart/monitoring are configured.
- Separate production database: FAIL; not configured/verified.
- Safe migrations: PASS locally; production `migrate deploy` target unverified.
- Production API without localhost: FAIL until deployment variables are configured.
- Production extension without localhost: FAIL for current artifact.
- Authentication: PASS in code/tests; external OAuth/cookie verification pending.
- Guest quota: PASS in code/tests; production values pending.
- Worker prevents stuck jobs: PASS in local code/runtime; supervision pending.
- Crawler legitimate targets: PASS post-fix locally; production egress pending.
- AI failures do not stick jobs: PASS in code path; provider outage test pending.
- Stripe webhook verification: PASS in code; external endpoint test pending.
- Critical security audit: PASS for automated/static checks; production header/config review pending.

## Automated Verification

- `pnpm lint`: PASS
- `pnpm typecheck`: PASS
- `pnpm format:check`: PASS
- `pnpm test`: PASS
- `pnpm prisma:generate`: PASS after releasing the Windows engine lock
- `pnpm prisma:validate`: PASS
- `pnpm prisma:migrate:status`: PASS; five migrations up to date
- `pnpm --filter @prospectai/web build`: PASS
- `pnpm --filter @prospectai/extension build`: PASS
- `pnpm --filter @prospectai/worker build`: PASS
- `pnpm audit --prod`: PASS
- `git diff --check`: PASS

Browser automation was unavailable; HTTP checks are not treated as browser QA.

## Backup / Recovery

Status: NOT VERIFIED FOR PRODUCTION.

Configure database backups/PITR, test restore, document Vercel rollback, worker restart, secret rotation, and safe analysis disable/pause procedures.

## Remaining Blockers

1. Separate preview and production infrastructure and variables from localhost development.
2. Select/configure managed PostgreSQL with pooling, direct migrations, backups, PITR, region, and `prisma migrate deploy`.
3. Deploy a supervised persistent worker with restart, heartbeat, queue-age/failure alerts, and logs.
4. Configure Google OAuth, Stripe, Resend, OpenAI, production URLs, and extension URLs.
5. Build and scan the production extension with no localhost/127.0.0.1 references.
6. Deploy and browser-verify Vercel Preview before production promotion.
7. Complete CSP/HSTS/CORS/cookie/security review and current secret scanning.
8. Configure backup/PITR and rollback/recovery runbooks.

## Final Decision

PRODUCTION BLOCKED - CONFIGURATION

The safest launch architecture is clear and preserves the existing PostgreSQL queue and dedicated worker. Production launch is not ready because infrastructure, deployment configuration, observability, production extension configuration, and real preview/production browser end-to-end verification remain incomplete.
