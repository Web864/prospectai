# ProspectAI Phase 1 - Understand

ProspectAI PRD V2 has been fully reviewed and is being used as the product source of truth.

## Phase 1 Scope

This document completes PHASE 1 - UNDERSTAND only. No production implementation has been started.

Primary source of truth:

- `prospectai-v2.docx` - ProspectAI PRD V2, Final Developer-Ready Specification.

Execution framework:

- `ProspectAI_PRD_Chrome_Web_Store_First.docx` - Chrome-Web-Store-first execution prompt containing the 12-phase build framework.

Repository inspected:

- `E:\presonal projects\propectai\prospectai`

## Repository State

The repository is a greenfield project.

Current contents:

- `.git/` only.

Missing at baseline:

- frontend app
- backend/API
- Chrome Extension
- worker
- packages
- package manager config
- environment examples
- database schema and migrations
- tests
- docs
- CI/CD
- deployment configuration

Git baseline:

- branch state: `main`
- no commits yet
- `origin/main` is marked gone
- no tracked source files exist

Runnable baseline checks:

- No lint, typecheck, build, test, migration, extension build, or security scripts exist yet.
- No dependency audit can be run because no package manifest exists.

## Document Priority and Contradictions

Priority order confirmed:

1. ProspectAI PRD V2 = product requirements.
2. Chrome-Web-Store-first execution prompt = execution framework.
3. Existing repository code = none yet.

Contradictions or scope tensions found:

- Analysis job states differ slightly. PRD V2 defines canonical states `QUEUED`, `VALIDATING`, `FETCHING`, `RENDERING`, `EXTRACTING`, `RULE_ANALYSIS`, `AI_PROCESSING`, `OPPORTUNITY_SCORING`, `COMPLETED`, `PARTIAL`, `FAILED`, `CANCELED`, plus retry states. The execution prompt uses a shorter set including `CRAWLING` and `ANALYZING`. Decision: use PRD V2 canonical states and map UI-friendly labels as needed.
- Database entity scope differs slightly. PRD V2 marks `Campaign`, `Template`, `FollowUp`, `Notification`, and `ExtensionInstallation` as optional later unless V1 use cases require them, while the execution prompt lists them as required in one place. Decision: for Phase 2 planning, treat PRD V2 core entities as mandatory and explicitly decide whether optional entities are needed for V1 routes/features.
- Plan quotas differ. PRD V2 suggests configurable Free around 10 analyses/month, Pro around 100-500, Agency around 1,000-2,000+, while the execution prompt gives example Free 10, Pro 200, Agency 2,000. Decision: quotas must be configurable and finalized in Phase 2/architecture, not hardcoded.

## Requirements Matrix

| Area                         | Requirement Summary                                                                                                                       | Status       | Notes                                                                        |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ---------------------------------------------------------------------------- |
| Product positioning          | AI Prospect Opportunity Intelligence, not generic SEO audit/CRM/email automation                                                          | MISSING      | No product implementation or messaging exists.                               |
| Target users                 | Freelancers, agencies, consultants, small sales teams                                                                                     | MISSING      | Must inform UX, onboarding, scoring, and copy.                               |
| Primary extension-first flow | Store install -> auth -> connect -> analyze current website -> opportunity -> pitch -> save lead -> dashboard -> usage -> upgrade         | MISSING      | Must be treated as first-class critical path.                                |
| Secondary website-first flow | Marketing -> signup -> onboarding -> install extension -> connect -> analyze -> save -> dashboard                                         | MISSING      | Must be included in Phase 2 plan.                                            |
| Chrome Extension             | Manifest V3, popup, current-tab detection, analysis request/status/result, save, pitch, usage, upgrade, disconnect, errors                | MISSING      | No extension files exist.                                                    |
| Extension permissions        | Least privilege, avoid unexplained `<all_urls>`, document every permission                                                                | MISSING/RISK | Needs architecture review and Chrome Web Store justification.                |
| Extension authentication     | Secure web auth handoff, one-time connection, limited session credential, expiry/revocation/disconnect                                    | MISSING/RISK | High-security design needed before implementation.                           |
| Extension session lifecycle  | Unauthenticated, pending, connected, expiring, expired, revoked, disconnected, unsupported version                                        | MISSING      | Must exist server-side and in extension UI.                                  |
| Extension UI states          | first launch, logged out, analyzing, queued, processing, result, errors, quota, offline, version mismatch, etc.                           | MISSING      | Needs compact popup UX.                                                      |
| Supported URLs               | Public HTTP/HTTPS business sites only; reject browser/internal/file/localhost/private/intranet/invalid                                    | MISSING/RISK | SSRF boundary is release-blocking.                                           |
| SaaS website                 | Marketing, auth, onboarding, dashboard, leads, detail, analysis, report, usage, billing, settings, extension management, privacy, terms   | MISSING      | No web app exists.                                                           |
| Onboarding                   | Role and services before/after first value; additional targeting data later                                                               | MISSING      | Must avoid blocking first analysis.                                          |
| Backend/API                  | Auth, authorization, organizations, extension sessions, jobs, crawler, analysis, AI, leads, pitches, reports, usage, billing, audit logs  | MISSING      | No backend exists.                                                           |
| Analysis pipeline            | Normalize, validate, security check, dedupe, fetch, extract, deterministic analysis, AI, opportunity scoring, persist, return             | MISSING/RISK | Needs job and worker architecture.                                           |
| Analysis jobs                | Async job model, canonical statuses, progress, attempts, failure codes, usage reservation, idempotency, duplicate prevention              | MISSING/RISK | Must prevent duplicate charges and infinite loading.                         |
| Duplicate analysis cache     | Configurable reuse window and visible analysis date                                                                                       | MISSING      | Needs product policy and persistence model.                                  |
| Evidence model               | Separate Evidence, Interpretation, Opportunity                                                                                            | MISSING      | Mandatory PRD requirement.                                                   |
| Finding entity               | Category, code, severity, evidence, source, confidence, deterministic score, commercial relevance                                         | MISSING      | Core data model requirement.                                                 |
| Technical analysis           | HTTPS, redirects, canonical, viewport, resources, response traits, tech hints, mobile/accessibility signals                               | MISSING      | Must avoid unsupported claims.                                               |
| SEO analysis                 | title, meta description, H1, hierarchy, canonical, robots, sitemap, OG, structured data, images, internal links                           | MISSING      | Deterministic extraction first.                                              |
| UX/conversion analysis       | CTA, hierarchy, navigation, trust, forms, conversion friction, mobile usability                                                           | MISSING      | AI-derived conclusions need confidence labels.                               |
| Business analysis            | Business type, services, audience, positioning, value proposition, gaps with confidence                                                   | MISSING      | Must not fabricate facts.                                                    |
| Website Score                | Deterministic normalized 0-100 score, configurable weights, ADR, version metadata                                                         | MISSING/RISK | LLM must not produce authoritative website score.                            |
| Opportunity Score            | User-specific 0-100 sales potential based on service fit, severity, confidence, impact, evidence quality                                  | MISSING/RISK | Needs deterministic/versioned/testable scoring model.                        |
| Service recommendations      | Service, strength, supporting findings, evidence, commercial reason, pitch angle, confidence                                              | MISSING      | Must be grounded in findings.                                                |
| AI engine                    | Business understanding, reasoning, service matching, outreach, strict schemas, token limits, validation                                   | MISSING/RISK | Server-side only; needs schema/versioning/evals.                             |
| AI security                  | Treat crawled content as untrusted, defend prompt injection/secret leakage/oversized content/malformed output                             | MISSING/RISK | Must be built into prompts, validation, and tests.                           |
| Crawler security             | SSRF, private IP, redirects, DNS rebinding, metadata endpoints, size/time limits, resource isolation                                      | MISSING/RISK | Release blocker if incomplete.                                               |
| Network isolation            | Crawler/browser infra isolated from sensitive internal networks                                                                           | MISSING/RISK | Requires deployment architecture.                                            |
| Crawl strategy               | HTTP-first, small crawl, render only when needed, stop with sufficient evidence                                                           | MISSING      | Important for cost and security.                                             |
| Lead management              | Lead model, statuses, duplicate domain rules, optional contacts/tags, notes, history                                                      | MISSING      | Core SaaS feature.                                                           |
| Pitch generation             | Cold email, short DM, LinkedIn-style, proposal opening, follow-up; grounded, editable, copy/save                                          | MISSING      | No automated sending in V1.                                                  |
| Reports                      | Analysis detail and reports with score, findings, recommendations, evidence, next actions                                                 | MISSING      | Shareable public reports are Should-Have unless needed for PLG.              |
| Public report security       | No private notes/contacts/account/billing/prompt data; unguessable tokens and revoke                                                      | MISSING/RISK | Required if shareable reports enter V1.                                      |
| Usage/credits                | Server-side usage ledger, atomic reservation/finalization/release/reversal, no client trust                                               | MISSING/RISK | Must prevent race conditions and negative balances.                          |
| Billing                      | Plans, checkout, subscription lifecycle, portal, entitlements, invoices where supported                                                   | MISSING/RISK | Provider must be selected in architecture.                                   |
| Billing webhooks             | Signature verification, storage, idempotency, replay protection, state-machine transitions                                                | MISSING/RISK | Cannot trust frontend payment success.                                       |
| Organizations/tenancy        | Organization-backed records and server-side tenant isolation                                                                              | MISSING/RISK | Must be designed before APIs.                                                |
| Database                     | Core entities, FK/index/unique constraints, deletion rules, transactions, retention                                                       | MISSING      | No schema or migrations exist.                                               |
| API principles               | Auth, authz, tenant checks, validation, rate limits, consistent errors, logging, request IDs                                              | MISSING      | Needs centralized patterns.                                                  |
| API areas                    | Auth, extension, analysis, leads, pitch, usage, billing, settings                                                                         | MISSING      | Must be planned endpoint-by-endpoint in Phase 2.                             |
| Security                     | Auth bypass, IDOR, XSS, CSRF, SQL/command injection, privilege escalation, brute force, prompt injection, abuse                           | MISSING/RISK | No controls exist.                                                           |
| Admin                        | Users, orgs, subscriptions, usage, jobs, abuse, audit logs, webhooks, system health, manual credits                                       | MISSING      | Admin auth and MFA required.                                                 |
| Observability                | Structured logs, request IDs, error tracking, job/queue/AI/crawler/billing/db health metrics                                              | MISSING      | No logging/monitoring exists.                                                |
| Cost controls                | Cache, dedupe, crawl/render limits, token limits, quotas, concurrency, abuse detection                                                    | MISSING/RISK | Needed for AI/crawler economics.                                             |
| Frontend standards           | TypeScript, reusable components, typed API clients, accessible responsive UI, central errors                                              | MISSING      | Stack not chosen yet.                                                        |
| Accessibility                | Semantic HTML, keyboard nav, labels, focus, contrast, screen-reader core workflows                                                        | MISSING      | Must be tested.                                                              |
| Analytics/KPIs               | Product funnel, activation, retention, revenue, outcome metrics, feedback signals                                                         | MISSING      | Should be planned without overbuilding.                                      |
| AI evaluation                | Representative evaluation dataset and QA failure rules                                                                                    | MISSING      | Needed before release.                                                       |
| Testing                      | Unit, integration, API, DB, auth/authz, AI, crawler/SSRF, billing, extension, E2E, production build                                       | MISSING      | No test harness exists.                                                      |
| Critical E2E                 | Extension install -> auth -> connect -> analyze -> result -> evidence -> recommendation -> pitch -> save -> dashboard -> usage -> upgrade | MISSING      | Release-blocking.                                                            |
| Edge cases                   | URL failures, blocked/huge/JS sites, AI failure, duplicate jobs, quota races, payment/webhook issues, revoked sessions                    | MISSING      | Must be planned and tested.                                                  |
| Deployment                   | Web/API, database, queue, worker, crawler/browser env, AI, secrets, backups, health, CI/CD, rollback                                      | MISSING      | No deployment assets exist.                                                  |
| Chrome Web Store release     | MV3 validation, production build, name/description/icons/screenshots/category/permissions/privacy/support URLs/no secrets/no localhost    | MISSING/RISK | Cannot claim readiness.                                                      |
| Legal/privacy                | Privacy, terms, data use disclosures, deletion/retention policies                                                                         | MISSING/RISK | Needed for SaaS and store submission.                                        |
| Out-of-scope control         | No mobile app, autonomous outreach, unrestricted browser agent, WhatsApp automation, massive CRM, complex automation                      | PASS         | No implementation exists that violates scope. Must preserve during planning. |

## Major Gap Summary

Architecture gaps:

- No monorepo/app structure.
- No chosen stack, architecture decision records, service boundaries, environment model, or deployment topology.
- Need modular monolith plus dedicated workers unless Phase 3 justifies otherwise.

Security gaps:

- No auth, authorization, tenancy, rate limiting, CORS/CSRF policy, SSRF protection, secrets policy, prompt-injection controls, webhook security, or admin security.
- Highest-risk areas are crawler SSRF, extension session security, tenant isolation, usage/billing race conditions, and AI output grounding.

Chrome Extension gaps:

- No Manifest V3 extension.
- No permission model, popup, service worker, content/current-tab logic, auth handoff, session storage, backend communication, UI states, production build, or store package.

Crawler gaps:

- No URL normalization/validation, DNS/IP inspection, redirect revalidation, crawl limits, network isolation, fetch/render strategy, extraction, or crawler acceptance tests.

AI gaps:

- No provider abstraction, prompt boundaries, structured schemas, output validation, evidence grounding, confidence model, failure handling, token/cost controls, or evaluation dataset.

Database gaps:

- No PostgreSQL schema, ORM choice, migrations, constraints, tenant isolation, usage ledger, job model, audit log, webhook event storage, retention policy, or backup plan.

Billing gaps:

- No provider decision, checkout, subscription model, entitlements, server-side usage enforcement, webhook verification/idempotency/replay protection, or plan configuration.

Testing gaps:

- No test framework, unit/integration/API/DB/security/E2E tests, extension tests, crawler SSRF tests, billing webhook tests, production build verification, or CI gates.

Deployment gaps:

- No local/dev/staging/prod environment model, secrets management, health checks, queue/worker deployment, crawler sandboxing, monitoring, backups, rollback, or CI/CD.

## Baseline Checks Run

Commands executed:

- `rg --files` at workspace root: found only the two DOCX documents.
- `Get-ChildItem -Force` at workspace root: found the two DOCX documents and `prospectai/`.
- `Get-ChildItem -Force -Recurse` inside `prospectai/`: found only `.git/` internals.
- `Get-ChildItem -Force -File` inside `prospectai/`: no files.
- `Get-ChildItem -Force -Directory` inside `prospectai/`: only `.git/`.
- `git status --short --branch` inside `prospectai/`: `## No commits yet on main...origin/main [gone]`.

Skipped because not applicable to a greenfield repo:

- dependency install
- lint
- typecheck
- unit tests
- integration tests
- production build
- extension build
- database migrations
- security audit tooling

## Phase 1 Conclusion

Phase 1 understanding is complete.

The project is sufficiently understood to move to Phase 2 - PLAN, but Phase 2 should begin from a greenfield architecture and implementation plan rather than from existing code.

Do not proceed to broad production implementation until Phase 2 produces a dependency-aware plan covering pages, routes, components, APIs, database operations, jobs, AI operations, extension flows, billing, validation, security controls, tests, Chrome Web Store release requirements, and deployment.
