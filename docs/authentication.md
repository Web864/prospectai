# Authentication and Guest Conversion

A guest session is an anonymous server principal with a random bearer token held in `chrome.storage.local`; PostgreSQL stores only its peppered hash. It has an isolated internal organization solely so existing tenant, job, and usage constraints remain authoritative. It has no email, password, OAuth identity, or User row.

After a result, the extension may start the existing browser-based PKCE handoff. The authorization request is associated with the guest bearer. The one-time code exchange validates state, expiry, PKCE, and replay protection before issuing extension credentials. The extension then calls the authenticated conversion boundary with the guest token in a separate protected header.

Conversion locks the guest session, is idempotent for the same user, rejects cross-user replay, transfers eligible analyses and active jobs to the authenticated organization, preserves the current result, marks the guest converted, and removes guest credentials locally only after server success. Web cookies are never copied into extension storage and provider secrets never enter the extension.

## Handoff Recovery

AuthHandoff states are pending, approved, completed, expired, or canceled. AUTH_HANDOFF_EXPIRED and AUTH_HANDOFF_INVALID are retryable presentation states and never consume guest allowance. The extension caches only the current analysis id across conversion, then removes guest credentials and restores the registered result automatically. A canceled handoff leaves guest mode usable until its own entitlement expires.

## Registered Authentication

Password accounts use salted scrypt hashes and hashed, expiring PostgreSQL sessions. Email verification and password reset use single-use hashed action tokens. Password reset revokes web and extension sessions.

Google sign-in uses Authorization Code plus PKCE. ProspectAI stores encrypted OAuth state in a short-lived HttpOnly cookie and a hash on the pending extension authorization request. The callback verifies state, expiry, one-time consumption, Google audience, issuer, token expiry, and verified email, then issues the normal server session. Provider secrets never enter browser JavaScript or extension storage.

A signed-out extension handoff preserves its request through login or signup and returns to the consent page. After one-time extension exchange, the extension converts the guest session transactionally and resumes with the current result.
