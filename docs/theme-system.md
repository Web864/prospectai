# ProspectAI Theme System

## Architecture

ProspectAI uses one semantic theme system for the web application and the Chrome extension.

The web application stores the selected theme under the local-storage key `prospectai-theme`. The root layout includes a small inline bootstrap before application content so the saved theme is applied before hydration. The interactive `ThemeToggle` is mounted in the public shell, authenticated workspace shell, and authentication form shell.

The extension uses the same semantic vocabulary locally in `popup.css` and persists its independent popup preference in `chrome.storage.local` under `theme`. It does not synchronize across origins or alter authentication, guest, analysis, permissions, or API behavior.

## Semantic Tokens

The canonical web tokens are defined in `apps/web/app/globals.css` and `apps/web/app/theme.css`.

Core roles include:

- canvas/background and foreground
- surface, elevated surface, muted surface, card, and popover
- border and strong border
- primary and primary foreground
- muted and placeholder foreground
- input and input foreground
- success, warning, danger, and info
- overlay, sidebar, header, code, selection, and focus ring

Existing ProspectAI aliases such as `--pa-color-primary`, `--home-ink`, `--workspace-surface`, and `--brand` remain derived from the canonical tokens so existing route styles continue to work.

## Light Theme

Light mode preserves the existing ProspectAI teal, blue, violet, and amber identity with a pale canvas, white surfaces, dark navy text, and soft borders/shadows.

It is the deterministic server fallback and the default when no saved preference exists.

## Dark Theme

Dark mode uses layered navy/green-blue surfaces instead of pure black:

- canvas: deep blue-green
- surfaces: elevated blue-green panels
- text: cool light foreground
- muted text: desaturated blue-green
- borders: visible slate-teal
- primary: brighter ProspectAI teal
- status colors: adjusted for dark-background readability

The final theme stylesheet adapts shared cards, forms, navigation, workspace surfaces, dialogs, menus, toasts, skeletons, empty/error states, and public page roots. Product mockups and brand artwork retain intentional fixed visual colors where they depict a product screenshot or logo.

## Persistence And Hydration

The inline root bootstrap reads the saved web preference before the page becomes visible. The server renders a deterministic light fallback, while the root HTML attribute is hydration-suppressed only because the bootstrap intentionally updates that attribute before hydration.

The toggle itself initializes from the already-applied root attribute and updates the attribute and storage together. It is keyboard accessible, exposes `aria-pressed`, and has an accessible label.

## Accessibility

- Theme switching is available through a semantic button.
- Focus rings use the active theme focus token.
- Text, inputs, borders, overlays, and status states use dark-mode-specific semantic values.
- Reduced-motion behavior remains controlled by the existing global media query.
- Color is not the only source of meaning for existing status components.

## Developer Rules

New UI must use semantic tokens instead of hardcoded theme-specific values. Prefer `var(--pa-color-...)` or an existing derived alias. Add a new token only when the visual role is genuinely new.

Brand marks, logos, product mockups, illustrations, and intentionally fixed status accents may retain fixed colors when changing them would alter the ProspectAI identity or the meaning of the artwork. Document any new exception next to the component.

## Verification

The theme toggle regression test verifies switching, persistence, root theme state, and accessible pressed state.

Automated verification passed for Prisma generation/validation/status, lint, typecheck, formatting, full tests, web build, extension build, worker build, dependency audit, and Git diff checks.

Full visual inspection at all requested routes and viewport sizes remains a manual browser task because no browser automation runner is configured in the repository.

## Live QA Update (2026-10-06)

A live Next.js development server was started at `http://localhost:3001` because port 3000 was already occupied. All required public, authentication, and workspace route requests returned HTTP 200, and the server emitted no runtime error while those routes were loaded. Static review found later dashboard, analyses, and research selectors that were outside the original dark-mode surface list; `apps/web/app/theme.css` now covers those legacy surfaces with the same semantic card, input, border, and text tokens.

The in-app browser automation backend required by the QA procedure was not exposed in this execution environment. Screenshot-level inspection, scrolling, computed-style checks, and interactive browser-state checks therefore remain manual verification items. Extension light/dark visual inspection also remains manual.

## Remediation Addendum (2026-10-06)

The verified dark-mode findings were addressed through the shared semantic layer. Dashboard metric values, labels, icon tiles, usage surfaces, workspace cards, analysis tables and actions, opportunity rows, lead surfaces, research panels, settings controls, billing panels, extension-management panels, auth gradients, public marketing cards, breadcrumbs, buttons, and mobile navigation states now resolve to the canonical theme tokens. The mobile drawer uses viewport-height sizing and remains scrollable.

The previously reported analysis-detail route `/app/analysis/cmudq23zr0008dpmg29ogyhe0` returned HTTP 200 on the provided local preview and did not require fixture data changes. Browser screenshot and computed-style verification remains pending because browser preview control is unavailable in this execution environment.
