# Phase 6 Backend

## Status

The Phase 6 backend is a modular monolith in the Next.js application plus a dedicated PostgreSQL worker. PostgreSQL is the only required stateful service.

Flow:

Web or Extension -> AnalysisJob row -> Worker -> Safe HTTP crawler -> Deterministic evidence and scores -> Optional AI -> PostgreSQL result

## Implemented Boundaries

- Password authentication: signup, login, logout, sessions, verification tokens, password reset tokens, expiry, and revocation.
- Google authentication: Authorization Code flow with PKCE, encrypted HttpOnly state, database-backed one-time state consumption, verified identity, and return to the extension handoff.
- Extension authorization: expiring request, consent, extension PKCE exchange, rotating hashed credentials, replay rejection, refresh, disconnect, and revocation.
- Guest sessions: opaque client token, peppered server hash, configurable allowance, expiry, PostgreSQL usage authority, transactional conversion, and preserved analyses.
- Analysis: registered and guest submission, URL policy, atomic usage reservation, idempotency, polling, cancellation, bounded retry, lease heartbeat, and abandoned-job recovery.
- Crawler: public HTTP/HTTPS only, DNS and redirect revalidation, SSRF blocks, timeout, redirect, content-type, response-size, and extracted-text bounds.
- Analysis engines: versioned deterministic findings, Website Score components, service recommendations, Opportunity Score, and strict optional AI schemas.
- Product APIs: analyses, opportunities, leads, pitches, reports, usage, dashboard, settings, billing state, checkout/portal, Stripe webhook, extension management, and owner admin overview.
- Operations: PostgreSQL rate-limit buckets, structured redacted logs, audit records, health check, and callable maintenance.

## Provider Behavior

AI is optional. Without an AI key, the worker persists a PARTIAL analysis with deterministic findings, Website Score, deterministic recommendations, and Opportunity Score. It never reports fake AI success.

Email supports explicit development and Resend adapters. The development adapter records only a masked recipient and delivery=false, and is rejected in production.

Billing uses Stripe checkout, portal, signature verification, event persistence, event-id idempotency, and subscription updates. Without Stripe configuration, billing returns a controlled provider error.

## Security

Every tenant-owned query derives organization identity from a hashed web or extension session. Client organization IDs are ignored. Guest result shaping is server-side. Passwords use salted scrypt. Tokens are random, expiring, and hashed at rest where reusable. OAuth and extension grants are one-time and replay protected.

Crawler protections block localhost, private and reserved IPv4, private/link-local/loopback IPv6, metadata targets, credentials, unsupported ports and schemes, and private redirect targets. Deployment must additionally deny private egress at the network layer.

## Runtime Verification

Run the web API and worker, then execute:

node tests/integration/phase6-runtime.mjs

The harness uses synthetic accounts and validates three guest reservations, duplicate idempotency, fourth-use rejection, worker completion, limited guest results, signup, conversion replay, converted-result access, leads, controlled AI unavailability, cross-tenant denial, extension PKCE exchange/replay, disconnect, and logout revocation.

## Maintenance

Run:

pnpm --filter @prospectai/worker maintenance

The task expires stale guest sessions and handoffs and purges expired raw extracted text. It intentionally does not cascade-delete organizations or user-owned product data.

## Production Dependencies

Production deployment must configure strong session/token secrets, a trusted PostgreSQL connection, TRUST_PROXY=true only behind a proxy that strips client-supplied forwarding headers, network egress isolation, and provider credentials for enabled Google, email, AI, and Stripe capabilities. Chrome unpacked-extension and provider sandbox verification remain release checks.
