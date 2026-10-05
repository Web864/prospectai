# ProspectAI Phase 8 - Hostile Production Security Audit

## Status

Phase 8 security hardening is implemented for the verified application risks in the current repository. The guest-first flow, PostgreSQL AnalysisJob queue, tenant authorization, PKCE handoff, and existing database hardening remain intact. Phase 9 has not started.

## Findings And Fixes

### SSRF and DNS rebinding

The crawler already rejected private and metadata addresses, restricted schemes and ports, bounded redirects, timed out requests, and capped response bodies. The remaining high-risk gap was that it validated DNS and then fetched the hostname separately, leaving a DNS-rebinding window. Production crawler requests now resolve the hostname, validate every returned address, and connect to the selected validated address directly. HTTPS preserves the original hostname for SNI and the Host header. Redirects are still manually normalized and revalidated before the next request. Test-injected fetchers remain available for deterministic tests.

### Billing callback redirects

Checkout callback URLs are now required to use the configured application origin. This prevents a caller with an authenticated owner session from supplying an unrelated phishing or exfiltration destination to the Stripe checkout flow. Stripe price IDs remain server-selected and the existing idempotency key behavior is unchanged.

### HTTP response hardening

The web application now sends X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin, X-Frame-Options: DENY, and a restrictive Permissions-Policy baseline. poweredByHeader was already disabled. HSTS and a deployment-specific CSP remain reverse-proxy/deployment concerns because the application has Next.js development/runtime scripts and OAuth/extension callback flows that require environment-specific policy testing.

## Controls Verified

- Web and extension authentication tokens are opaque and persisted hashed server-side; password hashing uses scrypt.
- PKCE uses a verifier/challenge flow with timing-safe comparisons and one-time authorization-code consumption.
- Extension runtime messages validate the sender ID and message shape; the MV3 manifest does not request <all_urls>.
- Guest sessions use opaque tokens, server-side PostgreSQL usage accounting, bounded allowance, expiry, and conversion checks. No browser fingerprinting or continuous browsing collection was introduced.
- Protected API reads and writes require an organization-scoped actor. Resource queries and worker result writes preserve tenant ownership checks.
- PostgreSQL queue claims use row locking and SKIP LOCKED; leases are fenced by job, worker, attempt, and lock state; retries are bounded.
- AI website content is explicitly untrusted input and model output is schema-validated before persistence.
- Stripe webhook signatures are verified and provider event IDs are unique/idempotent.
- No Redis/BullMQ runtime references remain.
- Redacted current-tree scans found no credential-shaped OpenAI/Resend/API-token matches. Secret values were not printed.

### Dependency supply chain

The production dependency audit initially identified vulnerable Next.js and transitive package versions. Next.js was upgraded to 15.5.24 and the patched floors for sharp, effect, deepmerge-ts, and postcss were enforced through the root pnpm overrides. The final `pnpm audit --prod` reported no known vulnerabilities.

## Residual Risks And Manual Infrastructure Requirements

- Production must terminate HTTPS and add HSTS at the trusted ingress or CDN after confirming all production origins are HTTPS.
- Production CSP should be finalized and tested against the deployed Next.js build, OAuth callbacks, and extension connection flow.
- Set TRUST_PROXY only when the deployment has a known trusted proxy chain. When enabled, configure the ingress to overwrite forwarded client-IP headers; do not expose the application directly while trusting spoofable forwarding headers.
- Use managed PostgreSQL access controls, encrypted backups/PITR, connection pooling limits, webhook payload retention controls, and log/trace redaction.
- Run dependency vulnerability review and credential rotation in CI/deployment tooling; no external credentials were required for this repository audit.

## Security Regression Tests

- Crawler URL/network safety and redirect revalidation: packages/crawler/test/\*.test.ts.
- Billing callback origin enforcement: apps/web/lib/billing-security.test.ts.
- Existing auth, PKCE, guest quota/conversion, queue lease, tenant isolation, webhook, and database-hardening tests remain in the repository and are included in the full test command.

## Verification

The final report records the exact command results for lint, typecheck, format, tests, Prisma checks, web/extension/worker builds, redacted secret scans, and git diff --check.
