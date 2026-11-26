# Extension popup rendering failure: root cause

Status: **fixed** on branch `claude/project-thread-c58328` (PR #4). Verified in a real, auto-sized
Chromium toolbar popup. NOT VERIFIED: branded Google Chrome on Windows (the reporter's machine).

## 1. Symptom

The toolbar popup opened as a very narrow vertical strip with a scrollbar. Almost none of the UI
was visible. An earlier report ("its width is too minimum") was the same bug in a milder form.

## 2. What the extension actually is

Determined from code, not assumed:

| Check                | Finding                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `manifest.config.ts` | `action.default_popup: 'src/popup.html'`. No `side_panel` key, no `sidePanel` permission.                                |
| Entry points         | `src/popup.html` → `src/popup.tsx` → `PopupApp` (`src/popup-app.tsx`). Service worker `src/service-worker.ts` has no UI. |
| Styling              | One stylesheet, `src/popup.css`. No Tailwind, no web-app CSS imported, no container queries.                             |
| JS sizing            | `src/motion.ts` only writes decorative CSS variables (`--mx`, `--gx`); nothing measures or sets dimensions.              |

**Architecture: action popup only.** It is not a Side Panel, iframe, tab or hybrid, so Side Panel
sizing rules don't apply.

## 3. How Chrome sizes a popup (the mechanism)

Chrome auto-sizes action popups. The popup window starts at its **minimum size, 25 × 25 px**. Chrome
lays the page out at that size and reads the width the content asks for. It then grows the window
to that width, capped at **800 × 600 px**. Height works the same way, and content beyond 600 px
scrolls.

So during the first layout pass the viewport is 25 px wide. Every viewport-relative value resolves
against 25 px: `vw`, a percentage width on the root, `width: auto`, and `@media (max-width: …)`.
If the root's width depends on any of them, the content asks for about 25 px. Chrome then keeps a
25 px window: a strip with a vertical scrollbar.

## 4. Rendering chain audit

| Layer                 | Rule (before)                                             | Effect in the 25 px first pass                                  |
| --------------------- | --------------------------------------------------------- | --------------------------------------------------------------- |
| `html`                | `margin: 0`                                               | Neutral.                                                        |
| `body`                | `width: 640px; max-width: 100vw`                          | **Bug 1.** `100vw` = 25 px, so body is clamped to 25 px.        |
| `body`                | `@media (max-width: 520px) { body { width: auto } }`      | **Bug 2.** A 25 px viewport matches, so body is `auto` = 25 px. |
| `#root`               | none                                                      | Inherits body's width.                                          |
| `.shell`              | `display: flex; flex-direction: column; overflow: hidden` | Fills body. Not a cause.                                        |
| header / main / cards | grid and flex children                                    | Squeezed by their parent. Symptoms, not causes.                 |

Each bug collapses the popup on its own, as shown by removing them one at a time:

| Stylesheet                                 | Real popup window | body                                  |
| ------------------------------------------ | ----------------- | ------------------------------------- |
| 640px redesign (both rules)                | **25 px**         | **10 px** (the rest is the scrollbar) |
| Only `max-width: 100vw` removed            | 25 px             | 25 px                                 |
| Only the media query removed               | 25 px             | 25 px                                 |
| Both removed (the fix)                     | **640 px**        | **640 px**                            |
| Original 380 px build (`max-width: 100vw`) | 224 px            | 224 px                                |

`max-width: 100vw` has been there since the first popup. In the 380 px build the window grew only
to the widest unbreakable content (224 px), which was the earlier "too narrow" report. The 520 px
"zoom" media query added in the redesign made it worse, down to 25 px.

## 5. Why earlier checks missed it

The visual E2E opened `popup.html` in a normal window (`chrome.windows.create` or a page with a set
viewport). Those windows aren't auto-sized, so `100vw` was the full window width and the layout
looked right. Headless Chromium doesn't auto-size popups either. Only a real
`chrome.action.openPopup()` in headed Chromium shows the bug.

## 6. Fix and width strategy

- **Fixed intrinsic width:** `body { width: 640px }`, with no `max-width`, `vw`, `%` or `auto`
  on `html`, `body`, `#root` or `.shell`.
- **No width media queries** in the popup stylesheet, because they match during the 25 px pass.
- **Why 640 px:** it leaves room for the two-column result, below Chrome's 800 px cap. Minimum
  usable width for this layout is about 560 px, and the maximum is 800 px (Chrome's cap).
- **Fluid behavior inside:** cards, text and buttons still reflow within 640 px (grid `1fr`
  columns, `min-width: 0`, wrapping text). Vertical scrolling happens on the popup document past
  600 px, which is Chrome's own behavior.
- **Browser zoom:** up to 125 % the popup fits (640 × 1.25 = 800). Above that Chrome caps the window
  at 800 device px and the popup scrolls sideways. That's the accepted trade-off. Collapsing the
  layout with a width media query is exactly what caused this bug.

## 7. Regression protection

- `apps/extension/src/popup-layout.test.ts` (unit, runs in CI) checks three things:

  - body has exactly one fixed `px` width, between 360 and 800.
  - The page root never uses `vw`, `%`, `auto` or `fit-content` widths.
  - There are no width media queries.

  All three tests fail on the broken stylesheet and pass on the fix.

- `apps/extension/e2e/popup-size.e2e.cjs` opens the **real** toolbar popup under Xvfb, measures the
  auto-sized window over the DevTools protocol, and fails below 600 px or on sideways scroll:
  `pnpm --filter @prospectai/extension build && xvfb-run -a node apps/extension/e2e/popup-size.e2e.cjs apps/extension/dist shot.png`

## 8. States

All screens render inside the same `.shell` and `main`, so the root fix covers every state:
detecting, unsupported page, ready, submitting, analyzing (real backend stage and progress,
unchanged), partial, completed, error and notice, session expired, guest quota, sign-in pending,
and network failure. In the real popup I measured the unsupported-page state (640 × 460). The ready,
progress, partial and completed states were checked at 640 px in `e2e/result-visual.e2e.cjs`.
No analysis, polling or job logic changed in this fix.

## 9. What to do on your machine

Your loaded `dist` folder still holds the broken build. Rebuild and reload:

1. `pnpm --filter @prospectai/extension build`
2. Go to `chrome://extensions` and click reload on ProspectAI (Development).
3. Close and reopen the popup.
