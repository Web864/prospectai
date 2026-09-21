# Phase 4 UX Architecture

ProspectAI PRD V2 remains the product source of truth. Phase 4 implements reusable, API-ready interfaces; sample analysis values are isolated inside view components for state verification and are not connected to production APIs.

## UX Architecture

The web application uses three layers: reusable controls and state components, marketing/auth/application shells, and route-level compositions. Application pages share one navigation model and consistent terminology. Evidence, interpretation, and opportunity are visibly separate. Website Score explains quality; Opportunity Score explains commercial fit.

## Design System

The foundation includes buttons, badges, score panels, metrics, form fields, navigation, state panels, plan cards, toolbars, progress indicators, responsive grids, and focus styles. The production interaction layer adds modal dialogs, confirmation dialogs, responsive drawers, dropdown menus, keyboard-navigable tabs, pagination, toast feedback, tooltips, skeleton loaders, and persistent confirmation states. Dialogs trap focus, close with Escape, and restore focus. Controls use semantic HTML and visible labels. Color is reinforced with text labels, not used as the only status signal.

## Page Inventory

- Marketing: Home, Features, purpose-built How It Works, Pricing, dedicated FAQ, Contact.
- Authentication and onboarding: Signup, Login, Email Verification, Forgot Password, Reset Password, role/services onboarding.
- Application: Dashboard, Leads, Lead Detail, Analysis Detail, Reports, Usage, Billing, Settings, Extension Management.
- Legal: Privacy Policy and Terms of Service foundations pending final legal review.

## State Strategy

Major pages use reusable panels for loading, empty, partial, failure, retry, quota, confirmation, and disconnected compositions. Production statistics are not hardcoded; missing backend data appears as `--`. The lead and analysis details are API-ready compositions with fixture content isolated in view modules until a later implementation phase connects authoritative endpoints.

Lead details separate overview, intelligence, and outreach/activity. Analysis details preserve the required Evidence -> Interpretation -> Opportunity chain and expose complete, partial, and failed states. Lead status controls use the approved `NEW`, `CONTACTED`, `QUALIFIED`, `WON`, `LOST`, and explicit archive workflow.

The extension owns a typed state map for first launch, authentication, connection, supported/unsupported page, every canonical analysis stage, completed/partial/failed results, lead/pitch confirmation, quota/upgrade, offline/backend failure, expired/revoked sessions, permission failure, and unsupported versions. Internal stages are translated into plain-language progress.

## Accessibility and Responsive Behavior

Pages use landmarks, named navigation, labeled form controls, live feedback regions, keyboard-visible focus, readable contrast, and text-backed statuses. Tabs support arrow, Home, and End keys. Overlays support Escape, contained Tab navigation, and focus restoration. The SaaS shell uses drawer navigation on tablet/mobile; metric, workflow, lead, and analysis layouts collapse progressively. The extension uses a 460px default width with a 420px minimum, wrapped URLs, fixed control sizing, bounded vertical scrolling, and no horizontal overflow.

## Verification

- pnpm lint: PASS across all applicable workspace projects.
- pnpm typecheck: PASS across all applicable workspace projects.
- pnpm format:check: PASS.
- pnpm test: PASS; 67 tests across database, configuration, auth, analysis, crawler, scoring, web, and extension suites.
- pnpm --filter @prospectai/web build: PASS.
- pnpm --filter @prospectai/extension build: PASS.
- pnpm --filter @prospectai/worker build: PASS.
- Browser automation is unavailable in this environment. Unpacked-Chrome visual, permission, and live provider handoff verification remains manual.

## Value-First Onboarding Revision

The connect-account-first popup is superseded. Implemented states cover first-use guest, guest ready/disclosure/analyzing/result/limit, auth start/pending/success/failure, registered ready/analyzing/result, unsupported page, offline/backend/rate errors, failed/partial analysis, unsupported version, and expired/revoked sessions.

Guest results deliberately remain compact: company/domain, basic Opportunity Score, reasoning, key signals, next action, and remaining allowance. Save, history, and pitch actions progressively start registration. The popup remains 460px by default with a 420px minimum, bounded vertical scrolling, no horizontal overflow, keyboard-visible focus, semantic buttons, text-backed state, and reduced-motion support.

### Conversion Continuity

The popup stores the current guest analysis id only while it is needed for conversion. The service worker completes PKCE, performs authenticated guest conversion, clears guest credentials, and publishes the converted analysis id. An open or reopened popup then reads the registered analysis endpoint and restores the result. Canceled or expired handoffs return to a retryable state without discarding the guest result.
