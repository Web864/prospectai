# ADR 0003: Value-First Guest Sessions and PKCE Conversion

Status: Accepted (supersedes connect-account-first onboarding)

The Manifest V3 extension uses `activeTab` and `storage` only. On first use it creates a high-entropy guest token locally and establishes an anonymous server session. PostgreSQL is authoritative for the configurable trial allowance; `chrome.storage.local` is only a session cache. Analyses require an explicit user click and enter the same PostgreSQL `AnalysisJob` queue used by registered accounts.

Guest sessions receive a private internal tenant boundary so existing URL, job, idempotency, and usage-ledger rules remain reusable. Guest APIs expose only limited result fields. Broad history, leads, exports, pitches, teams, and paid capabilities require an authenticated entitlement.

After value is shown, registration uses a browser authorization handoff with PKCE, one-time codes, short expiry, replay protection, and server-side exchange. Conversion is transactional and idempotent. No web cookie, password, provider secret, fingerprint, `<all_urls>`, or remotely hosted executable code is used.

The only analysis state persisted for conversion continuity is the current analysis identifier. After successful conversion, the service worker publishes it as a one-time registered-result restoration pointer, clears the guest token/session/disclosure/current-analysis values, and the popup removes the pointer after fetching the registered result. This does not store page content or browsing history.
