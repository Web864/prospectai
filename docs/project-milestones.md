# Project Milestones

Phase: PHASE 2 - PLAN

ProspectAI PRD V2 remains the product source of truth.

## Practical V1 Build Sequence

The project is greenfield. Implementation should proceed through a TypeScript monorepo using a modular monolith plus dedicated analysis worker.

## Milestone 1 - Foundation

Goal:

- Create the monorepo, shared tooling, environment validation, formatting, linting, typechecking, test harness, and baseline CI.

Key deliverables:

- `pnpm` workspace
- TypeScript project references
- Next.js web app
- Vite/React Chrome Extension app
- Node worker app
- shared packages
- `.env.example`
- root scripts for lint, typecheck, test, build
- initial CI workflow

Dependencies:

- none

Definition of Done:

- install works
- lint/typecheck/test/build scripts exist
- empty apps build with production configs
- environment validation fails safely for missing required server secrets

## Milestone 2 - Database and Domain Model

Goal:

- Establish PostgreSQL schema, ORM, migrations, tenant model, and core domain types.

Planned decisions:

- PostgreSQL
- Prisma ORM
- generated shared domain enums/types where practical

Core entities:

- User
- Profile
- Organization
- Membership
- AuthSession
- ExtensionSession
- Subscription
- UsageRecord
- Website
- WebsiteAnalysis
- Finding
- Opportunity
- Pitch
- Lead
- LeadContact
- Activity
- Tag
- LeadTag
- AnalysisJob
- WebhookEvent
- AuditLog

Optional/deferred unless a direct V1 flow needs them:

- Campaign
- Template
- FollowUp
- Notification
- ExtensionInstallation

Dependencies:

- Milestone 1

Definition of Done:

- clean database migration succeeds
- schema includes foreign keys, indexes, unique constraints, tenant ownership, timestamps, and deletion rules
- usage ledger and job idempotency constraints exist

## Milestone 3 - Authentication and Tenancy

Goal:

- Implement secure web authentication, organization membership, server-side authorization, and session revocation.

Planned approach:

- Use Auth.js/NextAuth-compatible server-side sessions if staying in Next.js route handlers.
- Use secure HTTP-only cookies for web sessions.
- Keep all tenant access checks server-side.
- Require verified email before full production use.
- Add admin role and MFA requirement design, with admin access disabled until implemented.

Dependencies:

- Milestones 1-2

Definition of Done:

- signup/login/logout/password recovery flow works
- session expiry/revocation works
- all protected APIs resolve authenticated user and organization server-side
- tenant isolation tests fail safely for cross-org access

## Milestone 4 - Extension Authorization

Goal:

- Implement secure Chrome Extension account connection.

Planned flow:

- Extension opens ProspectAI web auth/connect page.
- Backend creates one-time extension authorization request.
- User approves while authenticated in web session.
- Extension receives limited session credential through a safe handoff.
- Backend stores hashed extension session token, device label, version, last active, expiry, and revoked state.

Dependencies:

- Milestones 1-3

Definition of Done:

- extension can connect, refresh/status-check, disconnect, and recover from expiry
- revocation immediately blocks protected extension APIs
- extension never stores user password or privileged secrets

## Milestone 5 - Usage Ledger and Entitlements

Goal:

- Implement server-authoritative plan entitlement and atomic usage accounting.

Planned model:

- usage operations use `RESERVED`, `CONSUMED`, `RELEASED`, `REVERSED`
- analysis creation reserves credit atomically
- successful useful analysis consumes credit
- early hard failure releases credit
- all expensive operations use idempotency keys

Dependencies:

- Milestones 2-3

Definition of Done:

- quota checks cannot be bypassed from the client
- duplicate and concurrent requests do not double-charge or create negative balances
- usage summary API is driven by ledger data

## Milestone 6 - Analysis Job System

Goal:

- Build asynchronous analysis lifecycle with durable job state.

Canonical states:

- `QUEUED`
- `VALIDATING`
- `FETCHING`
- `RENDERING`
- `EXTRACTING`
- `RULE_ANALYSIS`
- `AI_PROCESSING`
- `OPPORTUNITY_SCORING`
- `COMPLETED`
- `PARTIAL`
- `FAILED`
- `CANCELED`
- `RETRY_PENDING`
- `RETRYING`

Planned queue:

- PostgreSQL `AnalysisJob` rows locally and in production-compatible deployments.

Dependencies:

- Milestones 2, 3, 5

Definition of Done:

- create/status/result APIs work
- job timeouts, retries, failure codes, progress, and duplicate prevention work
- abandoned jobs are recoverable by watchdog policy

## Milestone 7 - Safe Crawler

Goal:

- Implement secure public website fetching and extraction.

Planned approach:

- HTTP-first fetcher using Undici/fetch.
- Browser rendering with Playwright only when needed.
- Same-domain, small-page crawl only.
- URL validation before every request and redirect.
- DNS/IP/port validation blocks private/internal destinations.
- Configurable time, size, redirect, depth, text, DOM, render, and concurrency limits.

Dependencies:

- Milestone 6

Definition of Done:

- crawler acceptance tests cover normal, failure, abuse, private network, redirect, and oversized cases
- no target website can reach localhost/private/cloud metadata endpoints through the crawler

## Milestone 8 - Deterministic Evidence and Scoring

Goal:

- Extract objective findings and compute Website Score.

Planned areas:

- technical
- SEO
- performance/mobile
- accessibility indicators
- UX/conversion measurable signals
- trust/content indicators

Dependencies:

- Milestone 7

Definition of Done:

- Finding records persist with evidence, source, severity, confidence, and commercial relevance
- Website Score is deterministic, weighted, configurable, versioned, and documented by ADR

## Milestone 9 - AI Opportunity Engine and Pitching

Goal:

- Convert findings into business summary, opportunities, service recommendations, pitch angles, and outreach.

Planned approach:

- server-side AI provider abstraction
- strict JSON schema outputs
- bounded structured inputs
- website content treated as untrusted data
- findings required for every recommendation
- deterministic fallback to `PARTIAL` when AI fails

Dependencies:

- Milestones 3, 8

Definition of Done:

- AI outputs validate before persistence
- every opportunity references finding IDs
- pitch generation is grounded, editable, copyable, and saved
- prompt-injection tests exist

## Milestone 10 - Lead Management and Reports

Goal:

- Implement saved prospects, lead workflow, analysis detail, and reports.

Dependencies:

- Milestones 8-9

Definition of Done:

- leads can be created/updated/archived/deleted with duplicate domain protection
- analysis detail and report views show evidence, scores, recommendations, and pitches
- tenant isolation is enforced on every lead/report/analysis

## Milestone 11 - SaaS Web Application

Goal:

- Implement marketing, auth, onboarding, dashboard, leads, analysis, reports, usage, billing, settings, extension management, privacy, and terms pages.

Dependencies:

- Milestones 3-10 as relevant

Definition of Done:

- website-first flow works
- dashboard uses real server data
- responsive and accessible core workflows pass checks
- no production path relies on fake data

## Milestone 12 - Chrome Extension

Goal:

- Implement Manifest V3 extension as the primary daily-use product surface.

Dependencies:

- Milestones 4, 6, 9, 10

Definition of Done:

- extension-first flow works
- popup handles required PRD states
- production extension build succeeds
- permission review and CSP checks pass

## Milestone 13 - Billing

Goal:

- Implement paid subscriptions and entitlement synchronization.

Planned provider:

- Stripe as default unless Phase 3 finds a regional/business blocker.

Dependencies:

- Milestones 3, 5, 11

Definition of Done:

- checkout, portal, subscription updates, cancel, failed payment, webhooks, idempotency, replay protection, and entitlement mapping work

## Milestone 14 - Security Hardening

Goal:

- Fix security issues before release-level testing.

Dependencies:

- Milestones 3-13

Definition of Done:

- auth, authz, tenant isolation, SSRF, prompt injection, extension token handling, webhook security, rate limits, and secret scanning pass
- no critical/high release blockers remain

## Milestone 15 - Full Testing and Edge Cases

Goal:

- Validate all V1 behavior and required failure modes.

Dependencies:

- Milestones 1-14

Definition of Done:

- automated test suite passes
- critical extension E2E passes
- secondary website-first E2E passes
- production builds pass

## Milestone 16 - Production Release Preparation

Goal:

- Prepare deployment, observability, docs, Chrome Web Store package, and controlled beta release.

Dependencies:

- Milestones 1-15

Definition of Done:

- deployment docs complete
- health checks and monitoring configured
- backups/restore plan documented
- Chrome Web Store assets/checklist complete
- final audit determines release decision

## Critical Path

Foundation -> Database -> Auth/Tenancy -> Extension Auth -> Usage Ledger -> Analysis Jobs -> Safe Crawler -> Evidence Engine -> AI Opportunity Engine -> Leads/Reports -> SaaS UI -> Chrome Extension -> Billing -> Security -> Full Testing -> Release Prep

## Scope Guard

Do not implement these broadly in V1:

- autonomous outreach
- WhatsApp automation
- unrestricted browser agent
- massive CRM
- enterprise team management
- complex campaign builder
- large integration catalog
- mobile app
