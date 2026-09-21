# Chrome Web Store Plan

## Product Scope and Review Position

The extension has one narrow purpose: let an authenticated ProspectAI customer analyze the currently active website and view/save the resulting prospect intelligence. It does not alter search, inject ads, collect unrelated browsing history, or provide unrelated browser utilities. The listing, in-product disclosure, permissions, and privacy policy will use the same plain-language description of that purpose.

This follows Chrome's current requirement for a clear single purpose, least-privilege permissions, accurate listing/privacy information, and meaningful functionality. Store policy and asset requirements are rechecked immediately before submission because they can change. [Chrome Web Store Program Policies](https://developer.chrome.com/docs/webstore/program-policies/policies?hl=en) and [Chrome listing guidance](https://developer.chrome.com/docs/webstore/best-listing) are the release references.

## Extension Architecture

The extension is a separate TypeScript/React Vite application in `apps/extension` using Manifest V3. Its compiled ZIP contains only bundled, reviewed code and local static assets. No remotely hosted JavaScript, `eval`, or remote configuration capable of changing executable behavior is permitted.

| Component         | Responsibility                                                                                                                                        |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `manifest.json`   | Declares Manifest V3 metadata, action popup, background service worker, icons, and only reviewed permissions.                                         |
| Popup             | Shows authentication state, active-tab eligibility, analysis status/results, save-lead action, usage/upgrade state, and retry/recovery UI.            |
| Service worker    | Owns token refresh, secure API calls, extension-session lifecycle, job polling/backoff, notifications only if later approved, and message validation. |
| Active-tab reader | Obtains only the explicit current tab URL after a user action; it does not retain broad history.                                                      |
| Web handoff       | Opens the SaaS authorization page for login and explicit pairing approval, then exchanges a one-time PKCE grant with the backend.                     |
| Shared contracts  | Imports versioned request/response schemas from workspace packages; no duplicated hand-written API types.                                             |

The service worker treats all extension messages and API data as untrusted. UI code never has a billing-provider secret, AI key, database credential, or web-session cookie.

## Manifest and Permission Baseline

The planned manifest includes `manifest_version: 3`, a name, version, short description, action, service worker, and PNG icons at 16, 32, 48, and 128 pixels. Manifest V3 is the only supported manifest version according to Chrome's current reference. [Manifest file format](https://developer.chrome.com/docs/extensions/reference/manifest?hl=en)

Initial permissions are intentionally small:

| Permission                            | Reason                                                                               | Decision                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| `activeTab`                           | Read the current page URL only after the user invokes the action.                    | Required.                                                         |
| `storage`                             | Retain the extension session metadata and token material locally.                    | Required.                                                         |
| `alarms`                              | Resume bounded background polling/refresh if needed after service-worker suspension. | Add only when implementation proves necessary.                    |
| `notifications`                       | Optional completion notification.                                                    | Deferred; add only with an explicit user-facing setting.          |
| `scripting`                           | No planned use in the initial release.                                               | Not requested.                                                    |
| Broad host permissions / `<all_urls>` | Not needed for active-tab URL analysis.                                              | Prohibited unless a future capability has separate policy review. |

The API origin is declared only as narrowly as the browser requires for backend communication; environment-specific development origins are excluded from the release ZIP. Every requested permission must map to a visible feature and be documented in the listing. Chrome explicitly requires the narrowest permissions necessary and rejects attempts to future-proof a manifest with unused access. [Chrome permissions policy guidance](https://developer.chrome.com/docs/webstore/troubleshooting/)

## Authentication and Data Handling

1. The extension creates an expiring authorization request containing a PKCE challenge and opens the SaaS authorization URL in a browser tab.
2. The user signs in (or already has a secure web session), selects the organization if needed, and explicitly approves the pairing.
3. The extension exchanges the one-time grant plus PKCE verifier for a short-lived extension access token and rotating refresh credential.
4. The service worker uses the token only against the ProspectAI API and can revoke the pairing locally and remotely.

The extension transmits the active tab URL and only the minimum workflow metadata required to create/read an analysis. Page contents, credentials, form values, browsing history, and unrelated tabs are not collected. The privacy policy, Store privacy fields, onboarding disclosure, and extension UI must state this accurately before release. Chrome requires disclosure and affirmative consent for user data collection/use, and limits data use and transfers to the disclosed single purpose. [Chrome User Data policy](https://developer.chrome.com/docs/webstore/user_data)

## UX and Failure States

The popup is usable at narrow widths and contains the actual workflow first: sign in/connect, analyze current site, queued/running state, completed score/opportunities, save lead, usage limit/upgrade route, and clear error recovery. It must distinguish invalid URLs, blocked sites, unreachable sites, rate limits, expired session, and service failure. Long-running work continues server-side; the popup can close without cancelling a valid job.

The web app provides `/extension/connect`, `/extension/authorize`, and `/extension/connected` routes. Its authorization screen explicitly names the extension, the active organization, and the permitted purpose; it offers denial and later revocation from settings.

## Store Assets and Listing

Before submission, prepare the following reviewed assets and metadata:

- A 128x128 Store icon inside the extension ZIP, plus manifest icons and a simple, recognizable brand treatment.
- At least one real, current full-bleed screenshot at 1280x800 (up to five preferred) showing connection, analysis, and results; screenshots must not be mockups of unimplemented behavior.
- A small promotional tile at 440x280; a 1400x560 marquee image is optional and only useful for Store featuring.
- Accurate name, 132-character-or-shorter manifest description, longer listing description, category, support URL/email, privacy-policy URL, and data-use certification.
- A support and privacy page on the ProspectAI website that matches the exact shipped behavior.

Chrome's listing guidance calls for at least one screenshot, recommends up to five, and specifies 1280x800 or 640x400 image dimensions; its Store image guidance requires a 128x128 extension icon in the ZIP. [Listing assets guidance](https://developer.chrome.com/docs/webstore/best-listing) and [image requirements](https://developer.chrome.com/docs/webstore/images) are the final source for these assets.

## Packaging and Submission Checklist

1. Build from a clean, locked dependency install and inspect the production ZIP for source maps, secrets, development origins, unexpected files, and remote-code patterns.
2. Validate the manifest, all permission-to-feature mappings, CSP, external-connect rules, icons, version, and service-worker startup behavior in Chrome stable.
3. Complete extension E2E tests with the exact unpacked production build and run the policy/privacy review against listing copy and website disclosures.
4. Capture Store screenshots from working production-like flows and validate their dimensions and legibility.
5. Upload to an unlisted/tester channel first, complete install/pair/analyze/revoke smoke tests, then submit the reviewed public listing.
6. Record submission version, manifest hash, reviewer feedback, support owner, rollback version, and release decision in the release checklist.

## Post-Release Operations

Monitor installation-to-pairing conversion, analysis completion/failure by extension version, token-refresh failures, API compatibility errors, crashes, Store reviews, and support tickets without recording URLs or user data in analytics. Use semantic extension versions and maintain backwards-compatible API behavior for at least the currently published version. A kill switch may disable an unsafe server-backed feature but must not silently collect new data or change the extension's stated purpose.

## Value-First Store Disclosure (Superseding)

The extension no longer requires authentication before its first analysis. It creates a privacy-preserving anonymous guest session, displays the server-configured trial allowance, and analyzes only the active public business page after the user clicks the analysis button. Local storage contains only an opaque guest token, a public session id, and disclosure acknowledgement. No history permission, background page harvesting, fingerprinting, or `<all_urls>` access is used. Account authentication is offered after a result or at trial exhaustion through the existing secure PKCE handoff.
