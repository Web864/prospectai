# ProspectAI — Codex implementation handoff

Purpose: implement the approved premium Dashboard V3 styling IN your existing ProspectAI repository. This package is not the full application source.

## Included
- `CODEX_IMPLEMENTATION_PROMPT.md`: master step-by-step Codex instructions.
- `DESIGN_TOKENS.md`: quick visual specification.
- `references/prototypes/dashboard-v3.html`: **PRIMARY new visual reference**, HTML with embedded styles/scripts.
- `references/prototypes/dashboard-v2.html`: secondary reference for dashboard and research.
- `references/prototypes/homepage-v2.html`: approved marketing brand direction.
- `references/prototypes/design-system-v1.html`: component/design foundation (if present).
- `references/screenshots/*.png`: 16 old-app screenshots, by module and theme.

## Exact steps
1. Unzip this package.
2. Copy `references/` into your GitHub repo as `design-references/`.
3. Copy `CODEX_IMPLEMENTATION_PROMPT.md` and `DESIGN_TOKENS.md` into the repository root (or keep them nearby).
4. Open the **actual application repository root** in Codex, not just this handoff folder.
5. Ask Codex: `Read CODEX_IMPLEMENTATION_PROMPT.md and implement it in this repository. First inspect the codebase and write the route inventory, then update shared design tokens/layout, then the core pages. Use design-references/prototypes/dashboard-v3.html as the pixel/visual reference and design-references/screenshots as old feature references. Keep business logic intact.`
6. Review changes in git diff and run your app's build/test commands. Do not deploy unreviewed changes.

## Priorities
1. Dashboard shell + Research + Analyses
2. Opportunities + Leads + Pitches
3. Usage + Billing + Settings + dashboard Extension management
4. Responsive parity + real-data verification
5. Browser extension popup is **a separate later phase**

## Reference screenshot index
- `analyses-dark.png`
- `analyses-light.png`
- `opportunities-light.png`
- `opportunities-dark.png`
- `leads-dark.png`
- `leads-light.png`
- `pitches-light.png`
- `pitches-dark.png`
- `usage-dark.png`
- `usage-light.png`
- `billing-light.png`
- `billing-dark.png`
- `settings-light.png`
- `extension-light.png`
- `extension-dark.png`
- `misc-reference.png`

## Limitations
Images are reference captures, not approved UI illustrations.
The Codex task requires existing repo source code. This handoff does not alter GitHub remotely and cannot verify production compatibility without the repository.
