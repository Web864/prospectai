# Phase 3 Architecture

Phase: `PHASE 3 — ARCHITECTURE`

ProspectAI PRD V2 remains the product source of truth. This document records only architecture implemented in the repository.

## Implemented Foundation

- pnpm TypeScript workspace with `apps/web`, `apps/extension`, `apps/worker`, shared packages, test space, common lint/format/build commands, environment template, and GitHub Actions quality workflow.
- Next.js App Router web application with health endpoint and a typed, guarded analysis route foundation.
- Manifest V3 React/Vite extension with an action popup, service worker, active-tab-only access, local session storage, narrow production API host permission, and explicit extension-page CSP.
- Dedicated PostgreSQL-backed worker process separated from the web runtime. Job claiming, progress, retries, recovery, and usage settlement are persisted; analysis execution remains unavailable until isolated crawler and result adapters are connected.
- PostgreSQL Prisma schema with all core Phase 3 entities and tenant ownership via `organizationId`/foreign keys, indexes, and scoped uniqueness constraints.
- Shared packages for configuration, API errors/parsing, types, validation, authentication/PKCE primitives, analysis state transitions/queue, crawler boundary, deterministic scoring, AI output validation, Stripe billing boundary, UI primitive, and structured redacting logger.

## Security Boundaries

The browser and extension never receive database, Stripe, AI, session-pepper, or worker secrets. The extension collects only the active tab URL after direct use and uses no broad host permission. PKCE tokens are hashed server-side by the supplied auth primitives; the web session and extension-session resolvers are interfaces awaiting database-backed implementation in the next backend milestone.

The crawler boundary rejects malformed, credential-bearing, non-HTTP(S), localhost, private/link-local, and non-standard-port targets before a crawl. It deliberately returns unavailable rather than simulating a network crawl. Production crawler execution remains dependent on network isolation, DNS revalidation, redirect validation, timeout/byte limits, and worker persistence.

## Database Status

`packages/database/prisma/schema.prisma` defines the Phase 3 core model. It includes the required User, Profile, Organization, Membership, AuthSession, ExtensionSession, Subscription, UsageLedger, Website, WebsiteAnalysis, Finding, Opportunity, Lead, LeadContact, Pitch, Activity, AnalysisJob, WebhookEvent, and AuditLog models. Optional campaign, template, follow-up, notification, and CRM-expansion entities are intentionally absent.

An initial SQL migration is generated from this schema during Phase 3 verification when Prisma tooling is available; no database is provisioned or migrated by this phase.

## Deferred Deliberately

- Production user registration, email verification, password reset, and Auth.js session persistence.
- Final plan allowance mapping and API-layer rate limiting. Transactional PostgreSQL usage reservation and finalization are implemented.
- Network-isolated crawler execution and optional Playwright rendering.
- AI provider connection, prompt set, and evaluation corpus.
- Stripe price configuration, webhook route, and subscription synchronization.
- Product UI/UX workflows, marketing content, dashboard, and Chrome Web Store assets.

These are Phase 4 and later implementation work, not mocked production functionality.

## Final Verification

Completed on 2026-09-08 after correcting the Chrome extension icon asset setup.

| Command                                                                                                        | Result | Summary                                                                                                                                           |
| -------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm lint`                                                                                                    | PASS   | ESLint passed across all 16 workspace packages/apps. The web command targets `app` and `next.config.ts`, excluding generated `.next` output only. |
| `pnpm --filter @prospectai/web build`                                                                          | PASS   | Next.js production build completed; static and dynamic routes were generated successfully.                                                        |
| `pnpm --filter @prospectai/extension build`                                                                    | PASS   | TypeScript and Vite production build completed. Manifest includes packaged PNG icons at 16, 32, 48, and 128px.                                    |
| `pnpm --filter @prospectai/worker build`                                                                       | PASS   | TypeScript worker production build completed.                                                                                                     |
| `pnpm prisma:generate`                                                                                         | PASS   | Prisma Client 6.14.0 generated from the Phase 3 schema.                                                                                           |
| `DATABASE_URL=postgresql://prospectai:prospectai@localhost:5432/prospectai?schema=public pnpm prisma:validate` | PASS   | Prisma schema validated without requiring a live database connection.                                                                             |
| `pnpm typecheck`                                                                                               | PASS   | Full TypeScript workspace typecheck passed.                                                                                                       |
| `pnpm format:check`                                                                                            | PASS   | Prettier verification passed.                                                                                                                     |
| `pnpm test`                                                                                                    | PASS   | Baseline Vitest suite passed, including analysis state, crawler URL safety, and deterministic scoring tests.                                      |

## Final Fixes

- Added actual opaque PNG extension icon assets at `apps/extension/src/icons/icon-16.png`, `icon-32.png`, `icon-48.png`, and `icon-128.png`, matching every Manifest V3 icon reference.
- Kept the existing minimal extension permissions and Content Security Policy unchanged.
- Narrowed web lint input to source/config files so generated `.next` files are not analyzed as application source.

## Remaining Non-Blocking Notice

Next.js emits a build-time notice that its dedicated ESLint plugin is not configured. The workspace ESLint configuration is active and the web source lint passes; this is not a Phase 3 blocker.
