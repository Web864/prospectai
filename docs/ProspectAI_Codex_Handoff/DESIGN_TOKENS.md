# ProspectAI visual token source

Canonical source: `references/prototypes/dashboard-v3.html` CSS (this overrides approximations below).

| Token | Light value | Usage |
|---|---|---|
| `--bg` | `#F7F9FA` | Main workspace |
| `--panel` | `#FFFFFF` | Cards/topbar |
| `--ink` | `#101D2C` | Primary text, sidebar |
| `--muted` | `#627486` | Secondary copy |
| `--border` | `#E1E8EC` | Dividers and fields |
| `--green` | `#098568` | Primary action |
| `--mint` | `#E7F5EF` | Accent background |
| `--soft` | `#F1F5F6` | Secondary surface |
| `--danger` | `#D35E6F` | Semantic error |
| `--sideText` | `#B8C7D2` | Sidebar default |

Font headings: Manrope 600–800; body: DM Sans 400–700.
Preview sidebar width ~250px; topbar height ~79px; content padding ~35px 38px; card radius ~15px; button radius ~10px. Exact media queries and state styling: see canonical HTML reference.

For dark theme, inspect canonical CSS theme selectors and implement semantic variables with sufficient contrast rather than reusing light-mode ink colors on dark surfaces.

All raw PNG references are historic screenshots, not usable branded illustration assets. Do not embed them into the app interface.
