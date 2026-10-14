# Extension to API root-cause investigation

Date: 2026-10-14. Scope: existing extension/API/guest/job flow; no product phase started.

## Root cause and evidence

The inspected built extension calls `http://localhost:3000/api/v1`, with exactly
`http://localhost:3000/*` in its manifest host permissions. Initial process/listener
inspection found PostgreSQL on port 5432 but no web or worker process. The first
failure was therefore local API availability, before guest-session creation or AI.

One existing web script and one worker script were started. In real Chrome's
ProspectAI service worker, a POST to `/api/v1/guest-sessions` without credentials
returned HTTP 401 `GUEST_SESSION_INVALID`, confirming network connectivity and
authentication enforcement. The popup then created its own guest session (201)
and submitted analysis (202), using its own stored `Guest` authorization header.
No API-created analysis was substituted for the popup action.

A second runtime failure was discovered during follow-up verification: the running
Next server lost `.next/routes-manifest.json` and required chunks (`6814.js`, then a
vendor chunk), causing HTTP 500 and a request timeout. Clearing generated output
restored the session endpoint but the cache inconsistency recurred. Development
now uses `.next-development`; production build/start still use `.next`. This
isolates output ownership from production builds and `.next` cleanup. The exact
external actor that changed the earlier cache was not identified; concurrent
process snapshots showed only one web process tree. No source route or security
check was removed to repair it.

The failed Python.org submission created no database job, as confirmed by a
read-only PostgreSQL query before the subsequent UI attempt. After output
isolation, that attempt returned 202 and completed. No healthy job was retried.

## Fixes and files

- `apps/web/next.config.ts`: separate development output from production output.
- `apps/web/tsconfig.json`, `.gitignore`: support and ignore generated development output.
- `apps/web/next-env.d.ts`: Next regenerated its route-types reference for the development output directory.
- `apps/extension/src/api-errors.ts`, `api-client.ts`: categorize transport, timeout,
  HTTP, provider, quota, and malformed JSON failures; log endpoint/status/category only.
- `apps/extension/src/state-model.ts`, `popup-app.tsx`: accurate error states and
  existing check-again recovery; retain the active job until its valid result has
  been retrieved. A failed detail request no longer discards recovery state.
- `apps/extension/src/build-environment.ts`, `config.ts`, `vite.config.ts`,
  `package.json`: explicit local build and separately guarded production build.
- `apps/extension/src/api-client.test.ts`, `build-environment.test.ts`,
  `state-model.test.ts`: regression coverage.
- `tests/integration/chrome-probe.mjs`: Node built-in WebSocket Chrome diagnostic
  harness; records API endpoints/status and runtime exceptions without headers.
- `tests/integration/extension-result-comparison.mts`: read-only exact equality
  assertion of Chrome API results against persisted PostgreSQL projections.
- `docs/local-development.md`: API origin/build/process instructions.
- The concurrently added `apps/web/app/not-found.tsx` received formatting only.

## Real Chrome end-to-end evidence

Chrome loaded the unpacked `apps/extension/dist` through its supported
`Extensions.loadUnpacked` debugging command in an isolated profile. This was real
Chrome, not a simulated Chrome API. The manual Developer-mode dialog itself was
not exercised. `Extensions.triggerAction` invoked the toolbar action on a real
tab, granting `activeTab` through Chrome's normal action semantics. Calling
`chrome.action.openPopup()` alone did not grant that permission; this was a
diagnostic invocation limitation, not a reason to add broader permissions.

| Evidence                                | IANA                        | Python.org                  |
| --------------------------------------- | --------------------------- | --------------------------- |
| Target                                  | `https://www.iana.org/`     | `https://www.python.org/`   |
| Job                                     | `cmv7sm4gw000zdpukbvi73sde` | `cmv7tcwy90007dp5oo682tcmx` |
| Analysis                                | `cmv7sm4gi000xdpuknmy4cdq5` | `cmv7tcwvk0005dp5on2my65g3` |
| Worker                                  | `Dev-x-7648`                | `Dev-x-7648`                |
| Started UTC                             | `07:33:07.456`              | `07:53:57.536`              |
| Finished UTC                            | `07:33:38.334`              | `07:54:05.132`              |
| Attempt / job count                     | 1 / 1                       | 1 / 1                       |
| Terminal state                          | PARTIAL                     | PARTIAL                     |
| Guest opportunity score                 | 75                          | 88                          |
| API result HTTP                         | 200                         | 200                         |
| Exact database/API projection assertion | PASS                        | PASS                        |
| Actual rendered result                  | Limited result ready        | Limited result ready        |

Stage results:

- Extension public-page detection: PASS for both sites.
- Guest session: PASS; persisted identity survives popup and browser reopen.
- User-triggered guest submission: PASS; one job per completed analysis.
- PostgreSQL queue and worker claim: PASS; attempt 1 and worker claim logs recorded.
- Crawler, extraction and scoring: PASS; persisted findings and scored opportunities.
  Every short intermediate stage was not individually sampled from PostgreSQL.
- AI: ATTEMPTED / UNAVAILABLE; worker logged `analysis_ai_partial` for both jobs.
- Persistence: PASS; terminal progress 100 with `lockedAt` and `lockedBy` null.
- API and extension result: PASS; equality assertions compared every exposed field.
- Progress: PASS; IANA displayed stage 5/6, 75%, Generating insight and elapsed time.
- Popup close/reopen: PASS for IANA's same active job; reopening resumed polling and
  rendered its actual terminal result. No second job was submitted by recovery.
- Guest allowance: PASS; 3 -> 2 -> 1 from the two completed UI analyses.
- Runtime/network after repair: successful result requests returned 200 without
  captured extension runtime exceptions. Earlier server 500/timeout failures are
  recorded above, not relabeled as successful requests.

`extension-result-comparison.mts` asserted exact equality of ID, company name,
domain, opportunity score, reasoning, key signals, next action, and status for both
results. The guest API exposes the top persisted opportunity, not the aggregate
website-analysis opportunity score.

## Error handling

Developer categories distinguish `NETWORK_UNREACHABLE`, `API_UNAUTHORIZED`,
`API_FORBIDDEN`, `API_NOT_FOUND`, `API_RATE_LIMITED`, `API_SERVER_ERROR`,
`API_INVALID_RESPONSE`, `API_TIMEOUT`, `GUEST_QUOTA_EXHAUSTED`, `ANALYSIS_FAILED`,
`ANALYSIS_TIMEOUT`, `AI_UNAVAILABLE`, and `UNKNOWN_ERROR`. Guest exhaustion retains
the progressive registration flow. HTTP 401/403 remain authentication failures.
An AI failure alone does not imply an unreachable API or fabricate a completed
AI result. JSON and schema failures have an explicit invalid-response state.

## Security and configuration

- Chrome permissions remain `activeTab`, `storage`, `identity`; no `<all_urls>`.
- Actual extension-origin requests succeeded with scoped host permissions. No
  wildcard CORS, credential cookie relaxation, or authorization bypass was added.
- No keys, guest/access tokens, cookies, or response bodies are diagnostic logs.
- Secret-value comparison against 75 generated extension/web-client files found
  zero leaks for configured AI and authentication secrets.
- Runtime source scan found no Redis/BullMQ dependency references.
- Localhost, IPv4 `127.0.0.1`, and IPv6 `[::1]` health requests returned 200.
- Local build: `pnpm --filter @prospectai/extension build` uses explicit
  `local-development` mode. Its localhost manifest is intentional and not releasable.
- Release build: `pnpm --filter @prospectai/extension build:production` requires
  deployed HTTPS app/API URLs and rejects missing, localhost/loopback, HTTP, or
  credential-bearing URLs. Guard regression tests cover those cases.

## Verification

| Command                                     | Result                            |
| ------------------------------------------- | --------------------------------- |
| `pnpm lint`                                 | PASS                              |
| `pnpm typecheck`                            | PASS                              |
| `pnpm format:check`                         | PASS after formatting corrections |
| `pnpm test`                                 | PASS                              |
| Updated extension lint/tests/build          | PASS; 29 extension tests          |
| `pnpm prisma:generate`                      | PASS                              |
| `pnpm prisma:validate`                      | PASS                              |
| `pnpm prisma:migrate:status`                | PASS; five migrations, up to date |
| `pnpm audit --prod`                         | PASS; no known vulnerabilities    |
| `pnpm --filter @prospectai/web build`       | PASS                              |
| `pnpm --filter @prospectai/extension build` | PASS; local artifact              |
| `pnpm --filter @prospectai/worker build`    | PASS                              |
| Exact Chrome/database result comparison     | PASS for both analyses            |

Web and worker were paused after terminal results to release the Windows Prisma
engine, then restored. Database contents were not reset or deleted.

## Remaining dependencies and decision

### Final rebuilt-artifact Chrome gate

After all builds, Chrome successfully returned the unpacked extension ID and the
extension appeared in its normal `chrome://extensions` manager, with a Reload
control. The real Reload control was exercised while preserving stored guest
data. The diagnostic browser then closed. Reopening the same profile and invoking
the toolbar action caused another debugging disconnect. A new native Chrome
Crashpad `.dmp` was present (2026-10-14 13:10:40 Asia/Karachi). No crash-dump memory
or sensitive browser state was printed. Native crash internals have not been
diagnosed; it is not established whether this is a Chrome debugging-command bug,
profile corruption, or an extension-triggered browser defect.

The two successful UI-driven analyses and exact comparisons above are real
evidence, but they do not prove the final rebuilt-artifact reload gate. That gate
is BLOCKED pending a stable Chrome session and normal manual toolbar verification.
No additional jobs were submitted during this final check.

LOCAL EXTENSION/API FLOW VERIFIED.

Production remains blocked on deployed HTTPS URLs and supervised worker hosting.
Successful AI generation remains an external provider availability/configuration
requirement; both live jobs safely produced partial results instead. Manual Chrome
Developer-mode dialog and Chrome Web Store packaging remain release checks.
No production endpoint or production end-to-end verification is claimed.
