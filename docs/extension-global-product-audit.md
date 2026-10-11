# PROSPECTAI - EXTENSION GLOBAL PRODUCT AUDIT

## Product Design Source of Truth

The web application is the product source of truth. The canonical implementation is distributed across:

- `apps/web/app/globals.css`: ProspectAI type scale, spacing scale, radii, shadows, colors, focus ring, base controls, and reduced-motion behavior.
- `apps/web/app/theme.css`: light/dark semantic tokens and application-surface overrides.
- `apps/web/app/design-system.css`: shared buttons, inputs, badges, scores, state panels, tabs, pagination, cards, and workspace controls.
- `apps/web/components/app-shell.tsx`: authenticated navigation, workspace search, theme control, notifications, account state, breadcrumbs, and page header.
- `apps/web/components/design-system.tsx`: Button, Badge, Score, StatePanel, and Metric primitives.
- `apps/web/components/resource-feedback.tsx` and `apps/web/lib/use-api-resource.ts`: loading, retry, unauthorized, error, empty, and success resource behavior.

Canonical values identified: Inter with the Segoe/system fallback stack; 4/8/12/16/20/24/32/40/48 spacing; 4/6/8/12/16px radii plus pill badges; 14px UI text, 16px body text, 24/30/36px headings; 44px controls; white/light surfaces over a soft blue-gray canvas; ProspectAI teal primary actions; semantic blue, violet, green, amber, and danger states; and a 3px visible focus ring. The extension now uses the same font stack and semantic color values while retaining compact popup-specific sizing.

## Global Search

Implementation: `apps/web/components/app-shell.tsx` owns search state and filters the canonical application navigation plus Extension management.

Behavior: The input filters navigation labels synchronously as the user types. There is no server request or second search system. Search is navigation search, not prospect/business search.

Character-by-character: `P`, `Pr`, `Pro`, and `Pros` update the filtered result list immediately through controlled React state. Matching is trimmed and case-insensitive. Empty query hides the result region; no matches show `No matching workspace pages.`

States: empty, matching result list, no-match result, and clear-on-navigation are implemented. There is no network loading or network error state because this search is local navigation filtering.

Accessibility: It has a visible search icon, screen-reader label, `type=search`, listbox/option semantics, focus-visible styling, and keyboard-native input/link behavior. No extension search was added because search does not belong in the focused popup workflow; the popup links to the full web analysis where appropriate.

## Extension Design Audit

Typography: Previously close but locally defined. The popup now resolves its primary font and core text values from canonical ProspectAI semantic tokens.

Colors: The extension retains its compact visual treatment but its semantic light/dark values now align with the web token values for text, muted text, primary, border, surface, and soft surface.

Spacing: Compact popup spacing is preserved to keep the primary action visible without reproducing the dashboard.

Buttons: Guest analysis, registered analysis, authentication, retry, conversion, and report actions remain semantic buttons/links with focus, disabled, hover, and recovery behavior.

Cards: The focused value card and result cards remain popup-specific; the full workspace card system is not copied into the extension.

Inputs: The popup has no user-entered search/input workflow. Authentication input remains in the web app, where the canonical form controls apply.

Icons: Existing brand bitmap assets and CSS status indicators remain. Manifest icon sizes 16, 32, 48, and 128 are present in the built artifact.

Navigation: The extension has no dashboard navigation. It provides the focused current-page-to-analysis workflow and a full-report web link.

States: Detection, guest, analysis, result, conversion, authentication, unsupported, offline, backend, rate limit, partial, failed, expired, revoked, and permission states are represented by typed state copy and deliberate actions.

## Runtime Error

Root cause: The generic `backend_unavailable` state is the fallback for a failed extension `fetch`. The configured development API origin is `http://localhost:3000/api/v1`; if the local web server is not running, the popup correctly reports that the service cannot be reached. A live local health check returned `200`, and an unauthenticated guest-session request returned the expected `401`. No backend outage was reproduced.

Fix: Added operation-aware retry behavior, a duplicate-submit guard, direct session-expiry/revocation recovery, and an explicit initial page-detection state. No API contract or authentication bypass was introduced.

Verification: Extension lint, typecheck, 12 extension regression tests, and production build pass. Actual Chrome console/network verification was unavailable.

## Guest Flow

Status: Implemented server-authoritatively through guest session and guest analysis endpoints.

3 -> 2 -> 1 -> 0: Existing entitlement display and guest flow preserve the backend trial count. Reopen/reinstall does not reset the stored guest token; frontend-only quota is not used.

Conversion: Existing PKCE handoff converts the guest session and preserves the current analysis identifier. Service-worker conversion tests pass, including duplicate callback and transient conversion retry behavior.

## Authentication

Status: Existing extension authorization request, PKCE verifier/challenge, callback state validation, service-worker token exchange, session expiry, revocation, and guest conversion flows are retained. Expired/revoked popup states now expose a direct sign-in recovery action.

## Analysis

Status: Guest and registered submissions use the existing backend endpoints, idempotency keys, PostgreSQL-backed jobs, polling, partial result mapping, failure mapping, and result detail schemas. An in-flight gate prevents rapid repeated clicks from issuing duplicate submissions before React rerenders.

## Result UX

Status: Popup remains a concise summary with prospect/company, opportunity score, reasoning/signals, recommended next action, remaining guest entitlement, and full-report navigation where available. It does not reproduce the web dashboard.

## Error States

Status: State-specific copy exists for offline, backend unavailable, rate limited, analysis failure, authentication failure, expired session, revoked session, unsupported page, permission error, and version update. Retry now refreshes the relevant guest/session state or retries the failed analysis; session errors offer sign-in recovery.

## Theme

Light: PASS at source/build level using semantic light tokens.

Dark: PASS at source/build level using semantic dark tokens and dark surface/text overrides.

System: The web system supports persisted light/dark selection. The extension retains its existing local manual preference; system-preference behavior was not introduced because the popup already has an explicit persisted theme control.

Persistence: Extension theme remains in `chrome.storage.local`; guest state remains minimal and separate.

## Responsive Popup

Status: Source CSS defines a 460px popup with a 420px minimum in the normal range, a 520px maximum, mobile overrides below 440px/380px, hidden horizontal overflow, and vertical scrolling when needed. Built CSS and manifest generation pass. Actual Chrome resizing and visual inspection remain unavailable.

## Security

Permissions: Built manifest contains only `activeTab`, `storage`, and `identity`.

CSP: Self-only extension-page script policy remains; no remote code was added.

Secrets: No credential-shaped values were found in current extension source or built output. API secrets are not bundled.

Privacy: No continuous browsing monitoring, browsing history collection, fingerprinting, background analysis, or page-data collection before explicit analysis initiation was added. Current tab URL is read only when the popup opens; analysis starts only from a user action.

## Functional Controls

- Theme: toggles light/dark and persists to `chrome.storage.local`.
- Analyze This Prospect / Start Free Analysis: submits the existing guest or registered analysis request.
- Analyze Another Prospect: clears the current guest result and returns to guest-ready state.
- Continue with Google: starts the existing PKCE/OAuth handoff.
- Sign in: starts the existing account authentication handoff.
- Save This Prospect / Create Free Account: starts conversion authentication while preserving guest state.
- Try authentication again: retries the authentication flow.
- Try again: retries guest/session state or the failed analysis without duplicate submission.
- Sign in again: recovers expired or revoked registered sessions.
- Open full report: opens the existing web analysis route.
- Progress/result state: intentionally non-interactive while work is running.
- Service-worker pairing/conversion: handled through validated runtime messages; no dead popup control was introduced.

## Files Changed

- `apps/extension/src/popup-app.tsx`
- `apps/extension/src/popup.css`
- `apps/extension/src/state-model.ts`
- `apps/extension/src/state-model.test.ts`
- `docs/extension-global-product-audit.md`

Existing unrelated worktree changes were preserved.

## Tests

- Extension tests: PASS - 12 tests in 2 files.
- Existing service-worker conversion regression tests: PASS.
- Detection-state regression test: PASS.

## Build

- Extension lint: PASS.
- Extension typecheck: PASS.
- Extension build: PASS.
- Full repository lint, typecheck, format, test, Prisma, audit, and web/extension/worker build verification passes after this audit change.

## Browser Verification

Actual Chrome verification: NO.

The available environment exposes no Chrome/Playwright/Node browser automation tool. The popup was not loaded into real Chrome, and popup console, service-worker console, browser network, visual responsive states, and click-through guest/auth flows could not be honestly verified here.

## Remaining Issues

- Live Chrome verification is required for the final popup, service-worker, network, responsive, theme, and end-to-end guest/auth gates.
- Next.js is now pinned to 15.5.27, and `pnpm audit --prod` reports no known vulnerabilities.
- The local development extension fallback requires the web server to be reachable at the configured local API origin. Production builds require an explicit `VITE_API_BASE_URL`.

## Final Decision

BROWSER VERIFICATION BLOCKED
