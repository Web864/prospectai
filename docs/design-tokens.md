# Dashboard V3 Tokens

Source: `ProspectAI_Codex_Handoff/references/prototypes/dashboard-v3.html`. Its complete stylesheet was parsed with PostCSS and extracted to `apps/web/app/workspace-redesign.css`, with selectors scoped under `.app-shell.v3-app` and prototype classes prefixed `v3-`. The original blueprint is unchanged.

| Token        | Light     | Dark      |
| ------------ | --------- | --------- |
| `--bg`       | `#f7f9fa` | `#0c161d` |
| `--panel`    | `#fff`    | `#13252f` |
| `--ink`      | `#101d2c` | `#e8f2f5` |
| `--muted`    | `#627486` | `#afc0ca` |
| `--border`   | `#e1e8ec` | `#29404b` |
| `--green`    | `#098568` | `#098568` |
| `--mint`     | `#e7f5ef` | `#164a40` |
| `--side`     | `#101d2c` | `#08141b` |
| `--sideText` | `#b8c7d2` | `#b6cbd1` |
| `--soft`     | `#f1f5f6` | `#1a303a` |

## Source Dimensions

- Sidebar: 250px; padding 26px 15px 16px; active fill `#1b4b49`, 3px emerald inset indicator.
- Toolbar: 79px; horizontal padding 37px; utility buttons 41px square.
- Content: maximum 1560px; padding 35px 38px 85px.
- Body: DM Sans, 14px / 1.55. Headings and metrics: Manrope. Both fonts are self-hosted with their OFL licenses.
- Heading sizes: 30px / 18px / 15px. Metrics: 31px, weight 800.
- Stat cards: 15px radius, padding 20px 22px, 15px grid gap; no added shadow.
- Panels: 16px radius, 1px border, 24px inner padding, 18px upper margin.
- Buttons: 10px radius, padding 12px 18px, minimum height 42px.
- Fields: 9px radius, padding 10px 12px. Search width 265px.
- Table: minimum 820px with an internal scrolling region.
- At 1160px: two-column stats and single-column split panels. At 800px: mobile drawer, hidden toolbar search, 26px 18px 60px content padding. At 480px: two-column stats, 9px gaps, 14px card padding and 24px values.

## Necessary Integration Adaptations

- Existing logo and Lucide icons replace the prototype's text logo and Unicode icon placeholders.
- Existing theme persistence drives `data-theme`; source `.dark` rules map to that attribute.
- Letter spacing is zero, per repository implementation instructions, rather than the prototype's negative heading/metric spacing.
- Real API values replace sample figures. Extra existing KPIs, activity, usage history availability and account actions remain visible using the same components.
- API-unavailable fields show an unavailable state. No sample user, billing date, score or entitlement is introduced.
- Secondary actions use `v3-secondary`, corresponding directly to prototype `.secondary`.
- Existing accessible modal/drawer behavior, focus handling and reduced-motion support are retained. Mint status text is lightened in dark mode for readable contrast.
- Application-specific populated lists and validation/error states extend source panels, fields, table cells and status badges, not a separate visual language.
- The prototype's Leads example uses an inline five-column grid even on mobile. The application uses its source two-column responsive stat grid at narrow widths to keep real labels readable.

Public pages and the extension popup do not use this layer.
