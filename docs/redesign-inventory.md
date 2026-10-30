# Dashboard Redesign Inventory

The existing Next.js routes, API schemas, authentication and data hooks remain authoritative. Implementation blueprint: `ProspectAI_Codex_Handoff/references/prototypes/dashboard-v3.html`. The complete HTML, CSS and JavaScript were reviewed. CSS was extracted directly with scoped/prefixed selectors. The supplied screenshot contact sheet was inspected for functional completeness.

| Route                     | Existing component                        | Planned presentation                                                  |
| ------------------------- | ----------------------------------------- | --------------------------------------------------------------------- |
| `/app`                    | DashboardView, DashboardStats, MetricCard | Real KPI grid, primary research action, activity and connection state |
| `/app/research`           | ResearchView                              | Restrained URL-entry panel; retain submission and idempotency         |
| `/app/analyses`           | AnalysesView                              | Real counts, accessible loaded-record filters and table               |
| `/app/opportunities`      | OpportunitiesView                         | Real scores and service categories; evidence links                    |
| `/app/leads`              | Existing lead views                       | Shared panels, filters, tables and empty states                       |
| `/app/pitches`            | PitchesView                               | Shared list/editor surfaces and truthful empty state                  |
| `/app/usage`              | UsageView                                 | API entitlement and reset date, no sample progress                    |
| `/app/billing`            | BillingView                               | Subscription status; remove fabricated billing statistics             |
| `/app/settings`           | SettingsView                              | Existing forms with shared controls and hierarchy                     |
| `/app/settings/extension` | Existing management view                  | Shared surfaces; preserve actual connection response                  |
| `/app/analysis/:id`       | Analysis detail                           | Shared typography, evidence surfaces and controls                     |

AppShell retains navigation, search, collapse, mobile drawer, account and theme controls. Existing accessible dialog, tabs, toast, skeleton and form components are reused. No extension popup files, backend files, API contracts or database files are in scope.

## Reference Conflicts

- Sample metrics, increasing sparklines, dates and subscription promises are not real data and must not ship.
- Workspace search currently finds pages, not company records; label it accordingly.
- Sidebar connection claims have no query backing; connection status belongs to the data-backed management/dashboard screens.
- Browser rendering is required for visual sign-off; unavailable automation must be reported, not counted as a pass.

## Converted Source Components

`workspace-v3.tsx` converts source stat cards, surfaces, empty states and feature cards. AppShell converts the source sidebar, toolbar, content, intro and navigation. Existing routes and hooks retain responsibility for data and mutations. The analysis collection preserves real filtering and sorting from the preceding work.

Dashboard retains all eight real KPIs instead of discarding four to match the prototype's sample dataset. Leads metrics are explicitly limited to the loaded page; meeting counts are unavailable from that API. Analysis company names and completion timestamps are not supplied by the list contract, so company is unavailable and the timestamp is labelled Created at (UTC). Settings keeps all persisted profile fields. Billing actions and extension session actions call the unchanged existing handlers.

## Stages

1. Scoped semantic shell/control tokens, both themes and responsive layout.
2. Workflow panels and real-data analysis collection.
3. Supporting screens, usage and billing truthfulness.
4. Tests, formatting, lint, typecheck, build and available visual inspection.
