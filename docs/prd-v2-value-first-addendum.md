# ProspectAI PRD V2 - Value-First Onboarding Addendum

Status: Approved superseding requirement for Phase 4.

This addendum changes extension activation from **account first** to **value first, account later**. A fresh installation may analyze up to the server-configured guest allowance (V1 default: three) without email, OAuth, a User record, or manual extension pairing. The extension shows basic company context, Opportunity Score, reasoning, key signals, and a next action. Persistent leads, exports, complete history, advanced research, pitches, contacts, teams, CRM, and workflows remain registered or paid entitlements.

The required path is: install -> open a supported public business page -> open ProspectAI -> explicitly start analysis -> receive a limited result -> optionally register. Registration becomes required only after the allowance is exhausted or when the guest chooses to save a result.

Trial limits and free-plan limits are backend configuration. Clients consume `trialLimit`, `trialUsed`, and `trialRemaining`; they do not calculate authority from local counters. PostgreSQL serializes reservation and idempotency before creating an analysis job. Terminal failure releases eligible reservations through the existing queue lifecycle.

Guest identifiers are random opaque values. The backend stores only a peppered token hash. No browser fingerprinting, background harvesting, browsing-history permission, or analysis without an explicit click is permitted. LinkedIn and browser/internal/local pages remain unsupported until a separate policy and technical review approves them.

Guest results are retained for the configured guest-result period (V1 default: 30 days) only to support the popup, recovery, and account conversion. Conversion is authenticated, transactional, replay-safe, and transfers eligible analyses/current results to the user's organization without transferring unrelated browsing data or guest trial charges.

Product analytics may record only lifecycle events: `extension_first_open`, `guest_session_created`, `guest_analysis_started`, `guest_analysis_completed`, `guest_analysis_failed`, `guest_trial_remaining`, `guest_save_cta_clicked`, `guest_auth_started`, `guest_auth_completed`, `guest_converted`, and `guest_trial_exhausted`. URL/page content must not be included in analytics payloads.

## Conversion Continuity

The current guest analysis identifier may be cached locally only for the duration of authentication. After authenticated conversion, the extension must reopen that same analysis through the registered endpoint, clear guest credentials and temporary handoff state, and require no manual reconnect. Cancellation or an expired/invalid handoff must leave the guest result and entitlement intact.
