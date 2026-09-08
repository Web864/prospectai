# Phase 4 UX Architecture

ProspectAI PRD V2 remains the product source of truth. Phase 4 implements reusable, API-ready interfaces; sample analysis values are isolated inside product-view components for state verification and are not connected to production APIs.

## UX Architecture

The web application uses three layers: reusable controls and state components, marketing/auth/application shells, and route-level compositions. Application pages share one navigation model and consistent terminology. Evidence, interpretation, and opportunity are visibly separate. Website Score explains quality; Opportunity Score explains commercial fit.

## Design System

The foundation includes buttons, badges, score panels, metrics, form fields, navigation, state panels, plan cards, toolbars, progress indicators, responsive grids, and focus styles. Controls use semantic HTML and visible labels. Color is reinforced with text labels, not used as the only status signal.

## Page Inventory

- Marketing: Home, Features, How It Works, Pricing, FAQ, Contact.
- Authentication and onboarding: Signup, Login, Email Verification, Forgot Password, Reset Password, role/services onboarding.
- Application: Dashboard, Leads, Lead Detail, Analysis Detail, Reports, Usage, Billing, Settings, Extension Management.
- Legal: Privacy Policy and Terms of Service foundations pending final legal review.

## State Strategy

Major pages use reusable panels for loading-compatible, empty, failure, retry, quota, and disconnected compositions. Production statistics are not hardcoded; missing backend data appears as `--`. Phase 5 will connect these view contracts to authoritative API states.

The extension owns a typed state map for first launch, authentication, connection, supported/unsupported page, every canonical analysis stage, completed/partial/failed results, lead/pitch confirmation, quota/upgrade, offline/backend failure, expired/revoked sessions, permission failure, and unsupported versions. Internal stages are translated into plain-language progress.

## Accessibility and Responsive Behavior

Pages use landmarks, named navigation, labeled form controls, `aria-live` extension status, keyboard-visible focus, readable contrast, and text-backed statuses. The SaaS shell collapses to horizontal navigation on tablet/mobile; metric, plan, and recommendation grids collapse progressively. The extension stays at a stable 350px width with wrapped URLs and fixed control sizing.

## Verification

- `pnpm lint`: passed across all workspace source, including web components and extension states.
- `pnpm typecheck`: passed across all 16 workspace projects.
- `pnpm format:check`: passed.
- `pnpm test`: passed, including five web product-state tests and five extension-state tests.
- Web, extension, and worker production builds: passed.
- Live HTTP rendering: representative marketing, auth, dashboard, analysis, and extension-management routes returned `200` with server-rendered content.
- Responsive rules were statically checked at desktop, tablet (`800px`), and mobile (`520px`) breakpoints. Screenshot-based browser inspection could not run because the required in-app browser Node REPL tool was unavailable in this environment.
