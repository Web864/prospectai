# API Plan

## Contract Baseline

- Public application APIs use `/api/v1`; browser pages remain Next.js routes.
- Every payload is validated with Zod at the boundary. Responses are JSON and dates use ISO 8601 UTC strings.
- The server derives the active organization from the authenticated session or extension token. Client-supplied organization IDs are never trusted for authorization.
- Web clients authenticate with secure, `httpOnly`, `Secure`, `SameSite=Lax` session cookies. Extension clients use a short-lived bearer access token with a rotating refresh credential held in `chrome.storage.local`.
- Cursor pagination is `{ items, nextCursor }`; list limits default to 25 and cap at 100.
- Mutating, billable, or asynchronous creation routes require `Idempotency-Key`; keys are scoped to actor, route, and request-body hash and retained for 24 hours.
- Each response carries `X-Request-Id`. Logged request metadata excludes secrets, page content, AI prompts, and raw tokens.

## Error and Authorization Model

All failures use the PRD envelope:

```json
{
  "error": {
    "code": "USAGE_LIMIT_REACHED",
    "message": "Your monthly analysis limit has been reached.",
    "requestId": "req_...",
    "details": {}
  }
}
```

Expected error codes include `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `CONFLICT`, `RATE_LIMITED`, `USAGE_LIMIT_REACHED`, `ANALYSIS_UNAVAILABLE`, `EXTERNAL_SERVICE_ERROR`, and `INTERNAL_ERROR`. `404` is returned for records outside the caller's tenant to avoid identifier disclosure.

Role checks are centralized: `owner` manages organization, billing, and members; `admin` manages members and operational settings; `member` performs prospecting and manages own resources unless a product capability explicitly shares access. Every mutation writes an audit event.

## Endpoint Inventory

| Area                    | Endpoint                                                                                                                                                | Purpose and access                                                                  | Guardrails                                                                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Session                 | `GET /me`, `PATCH /me`, `POST /logout`                                                                                                                  | Current user, profile update, or web session termination; signed-in user.           | Profile mutation rate-limited; audit changes. Authentication-provider callbacks are handled by Auth.js, not custom routes.                                |
| Organization            | `GET /organization`, `PATCH /organization`, `POST /organization/switch`                                                                                 | Read/edit active organization; switch only to a verified membership.                | Owner/admin for edits; membership and tenant isolation tests are mandatory.                                                                               |
| Membership              | `GET /members`, `POST /members/invitations`, `PATCH /members/:id`, `DELETE /members/:id`                                                                | Team membership and invitations.                                                    | Owner/admin; email verification before acceptance; invitation and removal audited.                                                                        |
| Extension authorization | `POST /extension/authorization-requests`, `POST /extension/authorization-requests/:id/exchange`, `POST /extension/refresh`, `DELETE /extension/session` | Pair, exchange, refresh, and revoke an extension session.                           | Public request creation is IP-limited; exchange verifies an expiring PKCE challenge and one-time grant; no web session token is exposed to the extension. |
| Analysis                | `POST /analyses`, `GET /analysis-jobs/:id`, `POST /analysis-jobs/:id/cancel`, `GET /analyses/:id`                                                       | Submit a URL, observe job state, cancel eligible work, and read a completed result. | Signed-in web or paired extension user; `POST /analyses` requires idempotency and atomically reserves usage before enqueue.                               |
| Leads                   | `GET /leads`, `POST /leads`, `GET /leads/:id`, `PATCH /leads/:id`, `DELETE /leads/:id`                                                                  | Search/filter, save, read, update, and archive/delete a prospect.                   | Tenant scoped; destructive action is audited; filter values and sort fields are allow-listed.                                                             |
| Pitches                 | `POST /pitches`, `GET /pitches/:id`, `PATCH /pitches/:id`                                                                                               | Generate and retain an editable outreach pitch for a lead or analysis.              | Requires eligible analysis evidence; generation is idempotent and consumption is ledgered.                                                                |
| Reports                 | `GET /reports/:id`, `POST /reports/:id/share`, `DELETE /reports/:id/share`, `GET /public/reports/:token`                                                | Read internal reports and create/revoke optional public shares.                     | Public share is opaque, revocable, rate-limited, and excludes private user and billing data.                                                              |
| Usage                   | `GET /usage`, `GET /usage/ledger`                                                                                                                       | Current plan allowance and usage history.                                           | Signed-in tenant member; ledger entries are immutable and read-only.                                                                                      |
| Billing                 | `GET /billing`, `POST /billing/checkout`, `POST /billing/portal`, `POST /webhooks/stripe`                                                               | Subscription state, hosted checkout/portal redirects, and payment provider events.  | Owner only for checkout/portal; checkout is idempotent; webhook validates raw-body signature, timestamp, and event id before processing.                  |
| Settings                | `GET /settings`, `PATCH /settings`, `POST /settings/mfa/enroll`, `POST /settings/mfa/verify`, `DELETE /settings/mfa`                                    | User preferences and MFA lifecycle.                                                 | Re-authentication required for sensitive changes; recovery codes stored hashed.                                                                           |
| Admin                   | `GET /admin/users`, `GET /admin/jobs`, `POST /admin/jobs/:id/retry`, `GET /admin/audit-events`                                                          | Restricted operational support functions.                                           | Separate admin authorization and audit trail; never expose raw credentials or unredacted crawl bodies.                                                    |
| Operations              | `GET /health/live`, `GET /health/ready`                                                                                                                 | Liveness and readiness for deployment infrastructure.                               | Network restricted; readiness returns no secrets or tenant data.                                                                                          |

All paths in the table are relative to `/api/v1`, except webhook delivery, which uses `/api/webhooks/stripe` to match the provider configuration.

## Analysis Request and State Contract

`POST /analyses` accepts `{ url, forceRefresh?: boolean }`. The URL must be canonicalized, limited to `https`/`http`, reject credentials and non-public targets, and be subject to DNS, redirect, size, and time limits. On success it returns `202` with `{ jobId, analysisId, status: "queued", usageReservationId }`.

`GET /analysis-jobs/:id` returns the canonical state: `queued`, `running`, `succeeded`, `failed`, `blocked`, `cancelled`, or `timed_out`. A completed analysis contains structured signals, evidence links/excerpts, score, opportunity summary, confidence, and crawl metadata. It must distinguish a blocked/unreachable source from a successful zero-opportunity result.

The worker alone may transition jobs. Valid transitions are enforced transactionally: `queued -> running -> succeeded|failed|blocked|timed_out`; `queued|running -> cancelled` only when cancellation is still actionable. On terminal failure, the usage reservation is released or adjusted according to the billing policy.

## Rate Limits and Abuse Controls

| Boundary                                           | Initial policy                                    | Key                                    |
| -------------------------------------------------- | ------------------------------------------------- | -------------------------------------- |
| Login, password reset, email verification          | Low fixed-window limits with escalating lockout   | IP plus normalized account/email hash  |
| Extension authorization request and token exchange | 10 requests / 15 minutes; strict grant expiry     | IP, request id, extension installation |
| Analysis creation                                  | Plan allowance plus burst limit of 5 / minute     | Organization and user                  |
| Analysis polling                                   | 60 / minute                                       | Actor and job id                       |
| AI pitch generation                                | Plan allowance plus 10 / minute                   | Organization and user                  |
| Public report                                      | 30 / minute with bot protection when abuse occurs | IP and share token                     |
| Billing webhook                                    | Provider-origin validation; event-id dedupe       | Stripe event id                        |

Redis implements distributed limits, job coordination, and idempotency locks. Limits remain configurable without a code deploy and return `429` with `Retry-After`.

## Webhook Processing

The Stripe endpoint verifies the provider signature against the unparsed request body, rejects stale timestamps, stores the event id before side effects, and processes a normalized event in a durable worker. Subscription and entitlement updates are idempotent. Failed events are retried with backoff and surfaced in operations monitoring; the endpoint never trusts client-provided plan or price data.

## API Delivery Sequence

1. Establish shared validation, error, authorization, pagination, audit, idempotency, and rate-limit middleware.
2. Deliver identity, organization, and extension pairing contracts with integration tests.
3. Deliver analysis/job, lead, and usage contracts alongside the database schema and worker.
4. Add AI pitch and report contracts after evidence storage and output validation are present.
5. Add billing and restricted admin contracts only after tenant, ledger, webhook, and audit foundations are verified.
