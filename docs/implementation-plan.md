# Implementation Plan

Phase: PHASE 2 - PLAN

ProspectAI PRD V2 remains the product source of truth.

## Greenfield Decision

The repository is greenfield. Build a TypeScript monorepo using a modular monolith plus dedicated workers.

## Initial Stack Decisions

| Area            | Decision                                            | Reason                                                                               |
| --------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Package manager | `pnpm` workspaces                                   | Fast monorepo workflow and strict dependency layout.                                 |
| Language        | TypeScript                                          | Strong typing across web, extension, worker, and shared packages.                    |
| Web app         | Next.js App Router + React                          | Supports SaaS UI, API route handlers, auth integration, deployment flexibility.      |
| Styling         | Tailwind CSS + shared UI primitives                 | Fast accessible UI implementation with controlled design system.                     |
| Extension       | React + TypeScript + Vite + Manifest V3             | Simple production extension build and reusable UI/types.                             |
| Backend/API     | Next.js route handlers initially                    | Keeps V1 modular without premature service split.                                    |
| Worker          | Node.js TypeScript worker                           | Runs crawler, deterministic analysis, AI, and scoring outside request lifecycle.     |
| Database        | PostgreSQL                                          | Relational integrity, tenant isolation, billing/usage transactions.                  |
| ORM             | Prisma                                              | Mature migrations, strong typing, good productivity for greenfield SaaS.             |
| Queue           | Redis + BullMQ                                      | Durable async jobs, retries, progress, worker separation.                            |
| Crawler         | Undici/fetch HTTP-first, Playwright optional        | Efficient by default; browser rendering only when needed.                            |
| AI              | Server-side provider abstraction                    | Allows model/provider changes without rewriting business logic.                      |
| Billing         | Stripe by default                                   | Mature subscriptions, hosted checkout/portal, webhook model. Final check in Phase 3. |
| Auth            | Auth.js/NextAuth-compatible web sessions            | Good Next.js fit. Use secure cookies and server-side session resolution.             |
| Validation      | Zod                                                 | Shared request/response/env/AI schema validation.                                    |
| Testing         | Vitest, Playwright, extension-focused E2E harness   | Covers unit/integration/E2E and browser-extension workflows.                         |
| Observability   | structured logger + OpenTelemetry-ready abstraction | Practical local start, production-ready expansion.                                   |

## Repository Structure

Planned structure:

```text
apps/
  web/
  extension/
  worker/
packages/
  ai/
  analysis/
  api/
  auth/
  billing/
  config/
  crawler/
  database/
  scoring/
  shared/
  types/
  ui/
  validation/
tests/
  e2e/
  fixtures/
docs/
```

## Package Responsibilities

| Package/App           | Responsibility                                                              |
| --------------------- | --------------------------------------------------------------------------- |
| `apps/web`            | SaaS website, marketing pages, auth pages, app UI, API route handlers.      |
| `apps/extension`      | Manifest V3 extension popup/service worker and current-tab analysis client. |
| `apps/worker`         | BullMQ processors for analysis jobs, crawler execution, AI calls, scoring.  |
| `packages/api`        | Typed API contracts, error codes, client helpers.                           |
| `packages/auth`       | Server auth helpers, session resolution, authorization guards.              |
| `packages/database`   | Prisma schema, migrations, DB client, repository helpers.                   |
| `packages/analysis`   | Analysis orchestration domain logic, job state transitions.                 |
| `packages/crawler`    | URL validation, safe fetching, extraction, render fallback.                 |
| `packages/ai`         | AI provider abstraction, prompts, schema validation, failure handling.      |
| `packages/scoring`    | Website Score, Opportunity Score, weights, versions, tests.                 |
| `packages/billing`    | Stripe adapter, entitlement mapping, webhook processing.                    |
| `packages/validation` | Zod schemas shared by API, worker, extension, web.                          |
| `packages/types`      | Shared domain types/enums where not generated by Prisma.                    |
| `packages/ui`         | Shared React primitives and accessible UI components.                       |
| `packages/config`     | Environment validation, constants, plan config, feature flags.              |
| `packages/shared`     | Cross-cutting utilities without business authority.                         |

## Website Routes

Marketing:

- `/`
- `/features`
- `/how-it-works`
- `/pricing`
- `/faq`
- `/contact`

Authentication:

- `/signup`
- `/login`
- `/verify-email`
- `/forgot-password`
- `/reset-password`

Application:

- `/app`
- `/app/dashboard`
- `/app/leads`
- `/app/leads/[id]`
- `/app/analysis/[id]`
- `/app/reports/[id]`
- `/app/usage`
- `/app/billing`
- `/app/settings`
- `/app/settings/extension`

Extension connection:

- `/extension/connect`
- `/extension/authorize`
- `/extension/connected`

Legal:

- `/privacy`
- `/terms`

Admin:

- `/admin`
- `/admin/users`
- `/admin/organizations`
- `/admin/subscriptions`
- `/admin/usage`
- `/admin/jobs`
- `/admin/webhooks`
- `/admin/audit-logs`
- `/admin/health`

## Chrome Extension Architecture

Extension role:

- thin authenticated client
- current-tab URL detection
- analysis job creation/status polling
- compact result display
- save lead and generate pitch actions
- open dashboard/report/upgrade links

Extension components:

- `manifest.json`
- popup React app
- background service worker
- storage/session helper
- typed backend API client
- state machine for auth and analysis UI states

Initial permissions to evaluate:

- `activeTab`
- `storage`
- narrow host permissions for ProspectAI production API/web origin
- `scripting` only if current-tab metadata cannot be obtained safely without it

Avoid:

- privileged secrets
- password collection inside extension popup
- remote executable code
- `eval`
- unexplained `<all_urls>`
- continuous browsing-history collection

## Authentication Plan

Web:

- secure server-side session with HTTP-only cookies
- email/password or provider-backed auth chosen during implementation
- email verification
- password reset with expiry
- session revocation
- login rate limits

Tenancy:

- every user belongs to at least one organization
- all tenant-owned records scoped by `organizationId`
- backend derives organization access from membership
- client-supplied organization IDs are validated server-side

Extension:

- web-based authorization handoff
- one-time authorization code
- hashed stored extension session token
- short-lived access token or session credential
- refresh/status check through backend
- revoke/disconnect endpoint

## Database Approach

Use PostgreSQL with Prisma migrations.

Required integrity:

- foreign keys
- tenant-scoped unique constraints
- indexes for dashboard, lead, job, usage, and webhook lookups
- transactional usage reservation/finalization
- idempotency constraints for expensive/financial operations
- audit trail for admin and sensitive actions
- retention fields/policies for raw crawl and AI data

Core model groups:

- identity: User, Profile, Organization, Membership, AuthSession
- extension: ExtensionSession
- billing: Subscription, WebhookEvent
- usage: UsageRecord
- analysis: Website, AnalysisJob, WebsiteAnalysis, Finding, Opportunity
- sales: Lead, LeadContact, Pitch, Activity, Tag, LeadTag
- security/ops: AuditLog

## Analysis and Worker Plan

Analysis creation:

1. Authenticate user.
2. Validate requested URL shape.
3. Check entitlement.
4. Reserve usage atomically.
5. Deduplicate against active/recent jobs.
6. Enqueue job.
7. Return job ID and status.

Worker pipeline:

1. `VALIDATING`
2. URL normalization and security validation
3. duplicate analysis cache check
4. `FETCHING`
5. safe crawl/fetch
6. optional `RENDERING`
7. `EXTRACTING`
8. deterministic finding generation
9. Website Score calculation
10. `AI_PROCESSING`
11. AI opportunity reasoning
12. `OPPORTUNITY_SCORING`
13. persist analysis, findings, opportunities
14. finalize/release usage
15. `COMPLETED`, `PARTIAL`, or `FAILED`

## Crawler Architecture

Safety sequence:

- parse URL
- normalize
- validate protocol
- resolve DNS
- validate IP
- validate port
- request
- repeat validation for each redirect

Blocked:

- `localhost`
- loopback
- RFC1918/private IPv4
- private IPv6
- link-local
- cloud metadata endpoints
- unsupported protocols
- unsafe ports
- suspicious redirects

Limits:

- DNS timeout
- request timeout
- total analysis timeout
- redirects
- pages per analysis
- response bytes
- decompressed bytes
- extracted text bytes
- DOM size
- browser render CPU/memory/time
- per-user, per-tenant, and global concurrency

## AI Architecture

Use AI only for:

- business understanding
- prioritization
- commercial reasoning
- service matching
- pitch angles
- outreach text

Do not use AI for:

- auth
- authorization
- billing
- usage
- URL security
- raw measurements
- authoritative Website Score
- database integrity

AI inputs:

- structured deterministic findings
- selected page titles/headings/text excerpts
- bounded business summary context
- user services and preferences
- token-limited metadata

AI outputs:

- strict schema
- versioned schema
- validated finding IDs
- allowed service categories
- confidence ranges
- string limits

Failure behavior:

- retry bounded failures
- mark analysis `PARTIAL` if deterministic evidence exists but AI fails
- never persist malformed output directly

## Billing Architecture

Default provider:

- Stripe Checkout and Billing Portal.

Internal authority:

- backend subscription state and entitlement mapping.

Required flows:

- free plan
- checkout
- subscription activation
- upgrade
- downgrade
- cancellation
- renewal
- failed payment
- portal access

Webhook handling:

- raw body signature verification
- exact event storage
- idempotency key on provider event ID
- replay protection
- out-of-order event handling via state machine
- transactional entitlement update

## Deployment Plan

Initial deployment components:

- web/API app
- PostgreSQL database
- Redis queue
- worker process
- crawler/browser runtime
- AI provider credentials
- billing webhook endpoint

Environments:

- local
- development
- staging
- production

Required before launch:

- environment validation
- production secrets separate from development
- health endpoint
- queue/worker health check
- database migration process
- backup and restore plan
- logging and error tracking
- rollback strategy
- CI/CD pipeline running install, lint, typecheck, tests, migrations, and builds

## Phase 2 Exit Criteria

Phase 2 is complete when:

- milestones are defined
- critical path is defined
- repository structure is defined
- stack decisions are practical enough to begin implementation
- routes are planned
- API plan exists
- database approach exists
- job/crawler/AI/billing plans exist
- testing strategy exists
- Chrome Web Store plan exists
- V1 scope and risks are protected
