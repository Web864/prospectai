# Phase 5 Frontend Reconciliation

Status: Reconciled with the approved Value First, Account Later onboarding revision.

## Audit

### KEEP

- Registered web authentication, onboarding, session, usage, leads, pitches, settings, and billing UI contracts.
- PKCE verifier/challenge generation, one-time extension token exchange, and extension session refresh/revocation boundaries.
- PostgreSQL analysis-job polling and canonical progress states.
- Shared response validation and centralized API error envelopes.

### CHANGE

- Extension startup establishes or resumes an anonymous GuestSession before any account prompt.
- Analysis submission selects the guest or registered endpoint from the active credential; guest analysis does not require a User or ExtensionSession.
- Quota rendering uses server-returned trialLimit, trialUsed, and trialRemaining.
- GUEST_TRIAL_EXHAUSTED maps to progressive registration; invalid/expired guest sessions restart guest establishment; invalid/expired auth handoffs return to a retryable auth state.
- Successful PKCE exchange converts guest data, removes guest credentials, and restores the current analysis under the registered session without manual reconnection.

### REMOVE

- Connect-account-first startup.
- Authentication as a prerequisite for the first three configured guest analyses.
- Client-authoritative guest counters.
- Manual reconnect after guest registration.

### ADD

- Typed GuestSession, GuestEntitlement, GuestUsage, GuestAnalysisRequest, GuestAnalysisResult, GuestConversion, AuthHandoff, and TrialRemaining contracts and matching validation schemas.
- Progressive gates for Save Lead, complete history, and pitch generation.
- Minimal guest storage: opaque token, public session id, disclosure acknowledgement, and current analysis id only while needed for handoff.
- Guest session, idempotency, concurrent quota, terminal failure release, and handoff regression tests.

## Frontend Contract

A supported public page opens in Guest Mode with the authoritative free-analysis balance and an explicit Analyze action. A limited result is shown before registration. Save Lead, complete pitch/history, or a fourth V1 attempt starts PKCE registration. On success the extension becomes authenticated, the guest session is converted transactionally, and the current result is restored as a registered result.

No browser fingerprint, browsing-history collection, continuous monitoring, or background analysis is part of this frontend.
