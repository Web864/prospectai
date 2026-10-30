# CODEX MASTER IMPLEMENTATION PROMPT — PROSPECTAI

You are Codex working INSIDE the existing ProspectAI application repository.
Task: IMPLEMENT the approved premium redesign IN THE ACTUAL SOURCE CODE. Do not output an unrelated static demo, do not regenerate a new app, and do not silently remove existing product features.

## Source of truth and priority

1. ACTUAL REPOSITORY: existing routes, services, API contracts, state management, auth, database, subscription logic and tests are authoritative for how the app WORKS.
2. VISUAL TARGET: `design-references/prototypes/dashboard-v3.html` is the strongest visual reference for the **new dashboard UI**. Open/render and compare against it; do not merely skim the HTML. Use the original CSS variables and inspect all navigation states and theme variants.
3. SUPPORTING TARGETS: `design-references/prototypes/dashboard-v2.html` provides prior dashboard/research ideas; `design-references/prototypes/design-system-v1.html` shows foundation component styling; `design-references/prototypes/homepage-v2.html` aligns brand identity across marketing and app.
4. OLD PRODUCT REFERENCES: `design-references/screenshots/*.png` document actual module names, fields, filter groups, status handling, and light/dark parity. They are references for **functional completeness**, NOT instructions to replicate old visual defects.
5. This prompt is for a **redesign of existing code**. When mockup behavior conflicts with real working code, preserve actual behavior and adapt new UI accordingly. Do NOT hardcode fake metrics, fake users, fabricated analyses, fake billing periods, or unsupported entitlements.

IMPORTANT: Relative paths above assume the contents of this handoff's `references/` folder are copied into the app repository at `design-references/`. If running Codex from the handoff package itself, the corresponding paths are `references/...`.

## Visual design target (implement precisely)

- Premium restrained B2B SaaS; editorial clarity, NOT neon, glassmorphism, or decorative gradients.
- Primary light canvas `#F7F9FA`, white panels `#FFFFFF`, ink text and sidebar `#101D2C`, muted slate `#627486` (marketing slate `#526273`), borders `#E1E8EC`, refined emerald `#098568`, subtle mint `#E7F5EF`; dark theme use adapted accessible surface/text variables rather than simply inverting.
- Manrope for headings / prominent metrics, DM Sans for body/UI. If the repository has a font strategy, integrate these with it.
- Sidebar about 250px desktop, persistent/sensible scroll behavior; dark navy in light mode; understated emerald active indicator; consistent logo and icon weights. Retain REAL navigation items: Dashboard, Research, Analyses, Opportunities, Leads, Pitches, Usage, Billing, Settings, Extension.
- Top toolbar: global search (if present in actual app), existing relevant utility actions, theme switch, notifications, user account; never make dead-looking controls pretend to work.
- Content: max-width ~1560px, adaptive horizontal margins/padding ~24–38px, headings 28–32px, 10–16px radii, thin borders, restrained shadows. Metrics have readable labels, large values, subordinate context, consistent sizing.
- Buttons with clear primary/secondary roles, hover/focus/disabled/loading states; keyboard accessible nav/forms; no low-contrast emerald-on-emerald text.
- Desktop, tablet, and mobile states, no sideways overflow on narrow screens. Tables scroll horizontally or become responsive lists rather than squishing data beyond legibility.
- Both light and dark modes need thorough visual parity. Preserve persisted preferences if already implemented. Fix contrast issues visible in dark references (especially disabled buttons, body text, and mismatched text colors).
- Align marketing and app tokens where technically practical without breaking existing stylesheet architecture.

## Implementation scope and requirements

### Stage 0 — inspect before editing
- Read `package.json`, framework config, routing, src structure, design tokens/styles, UI component library, backend API usage, auth/session handling, test scripts.
- Create a succinct `docs/redesign-inventory.md` mapping each real screen/component to its current route and planned replacement.
- Inspect all supplied screenshots AND render `dashboard-v3.html` at desktop width. Use screenshot comparison when local browser/test tooling is available.
- Check git status, keep unrelated user changes, create no destructive migrations. Never introduce secrets or send code externally.
- Note conflicts between references and the live app instead of inventing functionality.

### Stage 1 — shared foundation (do this first)
- Set up semantic light/dark design tokens, typographic scale, spacing, radii, shadows, borders, focus rings, component states.
- Replace the app shell with the premium layout: sidebar, mobile drawer, topbar, breadcrumbs if already present, active nav states, page header, content container, error boundary/skeleton/loading states.
- Add reusable accessible components: Button, IconButton, Input/SearchField, Select, Tabs, StatCard, StatusBadge, DataTable or mobile list, EmptyState, Panel/Card, Toast/Alert as needed; reuse existing UI library rather than duplicate it.
- Use consistent icon library already present; if unavailable select one well-supported library. Do not use platform-dependent emoji as production icons.

### Stage 2 — core workflow screens (priority)
1. **Research**: use actual website URL entry and backend analyze action, input validation, disabled/loading/error/success states, examples only if product already supports them; connect to analyses flow.
2. **Analyses**: retain actual total/completed/in-progress/failed metrics, tabs All/Completed/In progress/Failed, search, status filter, sort, and table fields Website, Company, Status, Website score, Opportunity score, Analyzed at, Actions. Keep polling/status refresh only if supported by API. Show informative first-use/filtered empty states.
3. **Opportunities**: preserve total, high priority, average score, categories. Make opportunity cards/table actionable; distinguish score vs evidence and make unsupported filtering visibly unavailable rather than pretending it works. Real data only.
4. **Leads**: retain total/qualified/contacted/meetings/won where present, search, status, industry/location inputs where supported; empty state points to researching/saving opportunities. Preserve lead operations and existing access controls.
5. **Pitches**: redesign real pitch list/editor/generation workflow if present. Empty state shows Create first pitch and View opportunities only when routes/actions are valid. Never promise 'higher response rates' as fact.

### Stage 3 — account + supporting screens
6. **Usage**: real entitlement, analyses used, remaining quota, reset date and usage history availability. Never recompute billing state from mock numbers or fabricate count percentages.
7. **Billing**: current plan and invoices from real billing service. Only show buttons like Download invoice / Manage plan if the backend action exists; otherwise explicitly disabled with explanatory text.
8. **Settings**: real Profile / Account / Preferences / Integrations / Notifications / Security sections where implemented; labels, validation, save feedback, dirty state; avoid deleting stored user values.
9. **Extension management**: represent connected/disconnected/connecting/error accurately. The older screenshots contradict themselves ('Disconnected' and 'Extension active'); FIX the state logic and copy without hiding uncertainty. Chrome Store external link should only use an existing verified URL. Preserve extension handshake and auth mechanism.
10. **Dashboard overview**: retain real KPI data and focus attention on the primary Research action and useful recent activity.

### Stage 4 — verification
- Run the project's existing formatting, lint, typecheck, unit/integration tests, and build. Fix errors introduced by your changes.
- Perform responsive visual verification at approximately 1440px, 1024px, 768px, 390px and light/dark themes. Check no clipped sidebar, overlapping header, offscreen primary CTAs, horizontal page overflow.
- Verify navigation, disabled states, keyboard focus, form labels, loading/success/error states, empty states, and all API calls still function.
- Compare screenshots of implementation against `design-references/prototypes/dashboard-v3.html` side by side. Tighten spacing, sizes, typography, panel colors, borders, radius and layout until visually close. Maintain functionality over pixel identity where necessary.
- Do NOT rewrite backend, payment/auth/extension protocols or migrations for aesthetics.

## Deliverables inside repository
- Source code changes, organized in existing architecture.
- `docs/redesign-inventory.md` actual module/route map.
- `docs/design-tokens.md` final tokens including semantic light/dark mapping and typography.
- `docs/redesign-validation.md`: what changed by screen, verification commands/results, screenshots if available, known gaps.
- A concise final report: modified files, completed routes, checks passed/failed, functionality preserved, remaining blockers.

## Implementation rules / guardrails
- Preserve source file semantics and naming conventions where practical.
- Never change product permissions, signup flows, subscription limits, billing calculations, persisted schema, or authorization to achieve a visual match.
- Avoid introducing mock metrics to production UI. Use real query results and actual empty states.
- Refactor incrementally and keep app runnable. Avoid giant one-file rewrites.
- If the project differs from a React stack, use its actual framework; do not force React.
- Do not mark buttons as functional if they are placeholders.
- Do not edit browser extension popup code during this phase EXCEPT existing dashboard-side extension-management UI. Extension popup redesign comes later.
- Work autonomously after inspecting repo; do not block for minor ambiguities. If some design details cannot be implemented due to missing backend capabilities, document precise blockers, complete remaining improvements, and keep existing behavior intact.

## Success criteria
The RESULT must look materially like `dashboard-v3.html` in light and dark themes while providing the same real features and routes from the existing app. This is a source-code refactor, not a screenshot-only mockup.
