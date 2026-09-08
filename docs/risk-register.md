# Risk Register

ProspectAI PRD V2 has been fully reviewed and is being used as the product source of truth.

Severity key:

- `CRITICAL`: release-blocking or can create severe security/data/financial exposure.
- `HIGH`: serious product, security, billing, or reliability risk requiring explicit design and tests.
- `MEDIUM`: important risk that can harm UX, cost, or maintainability.
- `LOW`: lower-impact risk to monitor.

| ID    | Risk                                                                                             | Severity | Current Status             | Required Treatment                                                                                        |
| ----- | ------------------------------------------------------------------------------------------------ | -------- | -------------------------- | --------------------------------------------------------------------------------------------------------- |
| R-001 | Crawler SSRF against localhost, private IPs, link-local, metadata services, or internal networks | CRITICAL | No crawler exists          | Design URL/DNS/IP/redirect validation, network isolation, SSRF tests.                                     |
| R-002 | DNS rebinding or malicious redirects bypass initial URL validation                               | CRITICAL | No crawler exists          | Revalidate every resolved request and redirect destination.                                               |
| R-003 | Cross-tenant data access / IDOR in leads, analyses, reports, billing, usage                      | CRITICAL | No backend exists          | Organization-scoped data model, centralized authorization, tenant-isolation tests.                        |
| R-004 | Extension credential theft or long-lived/reusable token compromise                               | CRITICAL | No extension/auth exists   | Web auth handoff, limited session token, revocation, expiry, secure storage, tests.                       |
| R-005 | Exposed AI, billing, database, admin, or signing secrets in frontend/extension/source            | CRITICAL | No config exists           | Server-only secrets, env validation, secret scanning, no client secret prefixes.                          |
| R-006 | Usage quota race causing double spending, negative balances, or quota bypass                     | CRITICAL | No usage system exists     | Atomic ledger, transactions/locking, idempotency, concurrency tests.                                      |
| R-007 | Billing webhook forgery, replay, duplicate, or out-of-order events corrupt entitlements          | CRITICAL | No billing exists          | Signature verification, event storage, idempotency, state machine, transactional updates.                 |
| R-008 | AI recommendations fabricate claims or services without evidence                                 | HIGH     | No AI engine exists        | Finding references required, schema validation, QA tests, evidence-grounded prompts.                      |
| R-009 | Prompt injection from crawled websites manipulates system prompts or leaks data                  | HIGH     | No AI engine exists        | Treat website content as untrusted data, input boundaries, no secrets in prompts, prompt-injection tests. |
| R-010 | Website Score generated arbitrarily by LLM                                                       | HIGH     | No scoring exists          | Deterministic score module, configurable weights, score versioning, ADR/tests.                            |
| R-011 | Opportunity Score equates bad website with good sales opportunity                                | HIGH     | No scoring exists          | Include service fit, confidence, commercial impact, evidence quality, tests.                              |
| R-012 | Broad Chrome permissions cause privacy concern or Web Store rejection                            | HIGH     | No extension exists        | Minimal permissions plan and written justification before implementation.                                 |
| R-013 | Chrome Extension violates MV3 rules with remote executable code, eval, or unsafe CSP             | HIGH     | No extension exists        | MV3 architecture, CSP review, build scan, Web Store checklist.                                            |
| R-014 | Insecure extension message passing allows spoofed or unauthorized actions                        | HIGH     | No extension exists        | Validate message origins, command schemas, backend authorization, tests.                                  |
| R-015 | Client-side usage/billing/auth decisions are trusted                                             | HIGH     | No frontend/backend exists | Keep authoritative business logic server-side only.                                                       |
| R-016 | Analysis jobs hang forever or show fake progress                                                 | HIGH     | No job system exists       | Canonical states, timeouts, watchdog, bounded retries, real progress events.                              |
| R-017 | Duplicate analysis jobs create duplicate crawler/AI cost or duplicate usage charges              | HIGH     | No job system exists       | Idempotency keys, duplicate detection, cache window, transactional reservations.                          |
| R-018 | Crawler resource exhaustion from large pages, compression bombs, JS-heavy sites                  | HIGH     | No crawler exists          | Response/decompressed/DOM/text/render/time/concurrency limits.                                            |
| R-019 | Public reports leak private notes, contacts, account metadata, billing, or prompt content        | HIGH     | No reports exist           | Unguessable tokens, revocation, public-safe projection, tests.                                            |
| R-020 | Admin area lacks MFA, strict authorization, and audit logs                                       | HIGH     | No admin exists            | Admin role model, MFA requirement, audit trail, no public admin signup.                                   |
| R-021 | Auth implementation weakens password reset, session revocation, or brute-force protection        | HIGH     | No auth exists             | Prefer mature auth provider or secure implementation with rate limits and token expiry.                   |
| R-022 | Production readiness falsely claimed without builds/tests/security verification                  | HIGH     | No scripts exist           | Phase gates, documented verification commands, honest release status.                                     |
| R-023 | Pricing/quotas hardcoded throughout code                                                         | MEDIUM   | No billing exists          | Central plan config, migration-aware entitlements, tests.                                                 |
| R-024 | AI/crawler costs exceed plan economics                                                           | MEDIUM   | No cost controls exist     | Cache, dedupe, HTTP-first crawl, render selectively, token limits, cost telemetry.                        |
| R-025 | Onboarding delays first value beyond PRD activation target                                       | MEDIUM   | No UX exists               | Role/services minimal first, defer ICP/preferences where possible.                                        |
| R-026 | Product drifts into CRM, generic SEO audit, or autonomous outreach                               | MEDIUM   | No implementation exists   | Phase 2 scope guard and V1 feature boundaries.                                                            |
| R-027 | Accessibility missed across SaaS and extension popup                                             | MEDIUM   | No UI exists               | Semantic components, keyboard/focus/contrast tests.                                                       |
| R-028 | Missing observability prevents diagnosing failed jobs, AI, crawler, billing                      | MEDIUM   | No observability exists    | Structured logs, request IDs, health checks, metrics, error tracking.                                     |
| R-029 | Raw website content retained indefinitely                                                        | MEDIUM   | No storage exists          | Retention policy favoring structured findings over raw content.                                           |
| R-030 | Deployment lacks backups, rollback, staging, or secret separation                                | MEDIUM   | No deployment exists       | Environment plan, backup/restore docs, CI/CD, rollback strategy.                                          |

## Highest Priority Risk Themes

Critical release-blocking themes:

- SSRF and crawler isolation.
- Tenant isolation and authorization.
- Extension session security.
- Usage and billing integrity.
- Secret protection.

High-priority quality themes:

- Evidence-grounded AI.
- Deterministic and explainable scoring.
- Chrome Web Store permission/MV3 compliance.
- Real tests and phase-gated verification.

## Risk Register Conclusion

No critical or high-risk item is currently mitigated because no product implementation exists. Phase 2 must plan controls for these risks before broad implementation begins.
