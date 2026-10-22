# Analysis runtime and PDF verification

Verification date: 2026-10-15. No deployment or new product phase.

## Root causes and evidence

- 75% is the worker's persisted `AI_PROCESSING` milestone, not an estimate of elapsed work. AI calls have a 30-second timeout per request; business and opportunity requests are separate. A terminal PARTIAL at 100 means the available report was persisted, not that AI succeeded.
- The web detail added one to an already one-based attempt number. That could display Attempt 2 during the first attempt. The exact screenshot job ID was not supplied; its first-attempt failure cannot be reconstructed honestly. Historical database inspection found no retried PARTIAL job, but did find earlier exhausted crawler/persistence failures.
- Frontend polling stopped after 120 polls, and the extension imposed a five-minute client stale decision. Both could abandon healthy server work. Neither now terminates a healthy job.
- Research routed to a pending placeholder; the detail view now resolves the real analysis ID from job progress and refreshes the canonical result at termination.
- The pinned HTTP transport did not decode compressed bodies. One older Python.org result contained compressed bytes interpreted as HTML (thousands of replacement characters). gzip, deflate and Brotli are now decoded with both input and decoded byte bounds. Unreadable/binary content is rejected before evidence/scoring. Legacy unreadable result rows are not deleted, but detail/export refuses them and requests re-analysis.
- DNS and response-body operations lacked complete deadlines. DNS and each HTTP hop/body now have bounded deadlines; permanent ENOTFOUND is not retried, while temporary DNS failures remain retryable.
- Result persistence and queue completion were separate commits. They now share the same lease-fenced PostgreSQL transaction, including usage consumption. Progress updates also synchronize WebsiteAnalysis status.
- Port 3000 belonged to a different existing project. The ignored local environment now consistently selects ProspectAI port 3001 for web and extension. The other project was not stopped or modified. This is local configuration, not a production deployment setting.

## State machine and progress

`QUEUED -> VALIDATING -> FETCHING -> EXTRACTING -> RULE_ANALYSIS -> AI_PROCESSING -> OPPORTUNITY_SCORING -> COMPLETED | PARTIAL`

Actual stage milestones: queued/claim 0, validating 5, fetching 15, extracting 40, deterministic rules 60, AI 75, opportunity scoring/persistence 90, persisted terminal result 100. These are stage milestones, not measured percentage of CPU time. Retries reset progress rather than retaining a previous attempt's milestone. UI displays the server stage, milestone, elapsed time, actual attempt and terminal reason. Failed jobs do not become successful merely because a deadline elapsed.

## Retry and timeout policy

- The existing PostgreSQL AnalysisJob queue remains authoritative; no Redis or BullMQ is required.
- Claims, heartbeats and persistence are fenced by worker identity and attempt. Existing abandoned-job recovery and bounded retries remain in place.
- Invalid/private URLs, permanent authorization, missing analysis and explicitly permanent crawler errors do not retry. Transient network/timeout/infrastructure failures retain bounded backoff and nextAttemptAt.
- AI quota, authorization, timeout, invalid output and provider failures produce an explicit safe limitation; they do not restart the whole crawl. No fabricated AI findings are added.
- HTTP/DNS default deadline: 15 seconds per operation; AI request deadline: 30 seconds; result transaction deadline: 30 seconds. Default worker lease: 300 seconds, recovery scan: 60 seconds, polling: 1 second; heartbeat derives from configured lease duration.
- No arbitrary UI polling count or popup age declares a healthy job failed.
- The extension persists only the minimal pending submission identity needed to reuse an idempotency key across ambiguous responses/reopening. Successful job storage clears it. Research similarly retains an ambiguous submission key. Existing guest quota reservations and failure credit release remain authoritative in PostgreSQL.

## AI and PARTIAL semantics

Validated provider output can produce COMPLETED. Without valid AI output, real crawler evidence and deterministic scoring can produce PARTIAL. Stored aiStatus and shared limitations identify not-configured, quota, authorization, provider, timeout or invalid-output categories without provider response bodies, tokens or stack traces. Web, extension and PDF consume the same limitation mapping. The previously reported OpenAI quota issue is external; this continuation did not verify a new quota response. Current local provider configuration selects Gemini, but the fresh job never reached AI.

## PDF architecture and authorization

- Endpoint: `GET /api/v1/analyses/:analysisId/pdf` (Node runtime).
- Server-side pdf-lib plus embedded licensed Noto Sans produces selectable text directly from persisted WebsiteAnalysis, Website, Finding and Opportunity records. No DOM scraping, screenshot-to-PDF or invented data.
- Existing ProspectAI brand mark is reused. The report includes real timestamps/status/scores, prospect overview, evidence and interpretation, opportunities, scoring explanation, limitations and page numbers. Long URLs/findings wrap across pages; missing optional fields are explicit. Oversized reports fail explicitly rather than silently truncate.
- Authenticated requests must satisfy existing request authentication and organization ownership. Guest authorization requires the exact valid Guest session plus organization and guestSessionId ownership. Failed guest authorization never falls back to user authentication. Cross-owner analysis IDs return 404.
- Only COMPLETED/PARTIAL records export; queued/running/failed and unreadable legacy results return 409. Rate limiting, private no-store caching, nosniff and sanitized attachment filenames apply. Internal IDs, worker metadata and credentials are not report fields.
- Web detail exposes Export PDF only for available terminal reports, with pending, download and safe error feedback. Extension generation is intentionally web-only; no inert export button or duplicated renderer is added.
- Font license: `apps/web/public/assets/prospectai/fonts/OFL.txt`.

## One fresh live extension analysis

Exactly one analysis was submitted in the fresh Chrome profile. No follow-up job was created to obtain a green report.

| Evidence  | Observed value                                                                              |
| --------- | ------------------------------------------------------------------------------------------- |
| Target    | https://www.iana.org/                                                                       |
| Job       | cmv95smzj000bdpgc79mt92e0                                                                   |
| Analysis  | cmv95smyv0009dpgcyvopbtyj                                                                   |
| Worker    | Dev-x-17224                                                                                 |
| Start     | 2026-10-15T06:29:52Z                                                                        |
| Terminal  | 2026-10-15T06:30:29.670Z, FAILED                                                            |
| Attempt 1 | validating 5 at 06:29:52.776; fetching 15 at 06:29:52.805; crawler failed at 06:30:04.060   |
| Attempt 2 | validating 5 at 06:30:05.095; fetching 15 at 06:30:05.112; crawler failed at 06:30:16.357   |
| Attempt 3 | validating 5 at 06:30:18.386; fetching 15 at 06:30:18.403; terminal failure at 06:30:29.670 |

Real Chrome loaded the built extension, detected the IANA tab, created a guest session, submitted once (202), polled actual job state (200), showed fetching, closed/reopened the popup and recovered the same job. The terminal failure appeared and remaining allowance returned to 3. No duplicate submission occurred. The worker remained alive. No uncaught service-worker exception was observed during these probes.

The independent read-only Node DNS diagnostic returned `getaddrinfo ENOTFOUND www.iana.org`. Chrome reaching the site does not prove Windows Node DNS can resolve it. Evidence/scoring/AI/result persistence and matching API result were NOT REACHED in this fresh run. The permanent DNS classification fix was subsequently regression-tested, not verified by creating another live analysis. No hardcoded DNS, proxy/SSRF bypass or fake result was used.

## PDF runtime evidence and limits

- A real existing readable IANA PARTIAL analysis (`cmv7sm4gi000xdpuknmy4cdq5`, analyzed 2026-10-14) generated a 14,026-byte PDF from PostgreSQL using the same canonical projection/renderer. Chrome displayed its two readable pages with the existing logo and actual scores. This is not the fresh failed analysis.
- `tests/integration/persisted-pdf.mts` is explicitly an administrative read-only rendering diagnostic, not proof of an authenticated API download. Its generated artifact is ignored under test-results.
- Real extension-context PDF requests returned 409 for the fresh FAILED analysis and 404 for another guest's prior analysis. An unauthenticated request returned 401.
- Authorized successful COMPLETED/PARTIAL exports, guest ownership, tenant isolation, error sanitization, filenames, content type, long content and missing fields are covered by route/renderer tests. Successful authorized API download from a newly completed live job remains unverified because the one fresh analysis failed before crawling.

## Regression coverage

Queue tests cover canonical progress synchronization, atomic terminal completion, fencing, stale recovery, usage/idempotency and retry classification. Worker tests cover AI success and quota/timeout/provider/invalid-output PARTIAL outcomes and lease loss. Crawler tests cover compression, byte limits, unreadable text, DNS deadlines/classification, body deadlines and HTTP permanent/transient classification. Web tests cover polling beyond the previous cutoff and pending-ID resolution. Extension tests cover persisted submission identity/reopening. PDF route and renderer tests cover authorization and document behavior separately.

## Verification results

Final command results are recorded below after execution; no database reset, migration modification, deployment or new product phase was performed.

| Exact command (Windows uses pnpm.cmd)       | Result                                                                  |
| ------------------------------------------- | ----------------------------------------------------------------------- |
| `pnpm lint`                                 | PASS                                                                    |
| `pnpm typecheck`                            | PASS                                                                    |
| `pnpm format:check`                         | PASS after formatting corrections                                       |
| `pnpm test`                                 | PASS across workspace; web 58 tests, including PDF route/renderer       |
| `pnpm prisma:generate`                      | PASS, Prisma Client 6.14.0 generated                                    |
| `pnpm prisma:validate`                      | PASS                                                                    |
| `pnpm prisma:migrate:status`                | PASS, all five migrations applied; local prospectai database up to date |
| `pnpm --filter @prospectai/web build`       | PASS, Next.js 15.5.27; PDF endpoint included                            |
| `pnpm --filter @prospectai/extension build` | PASS, explicitly local-development mode                                 |
| `pnpm --filter @prospectai/worker build`    | PASS                                                                    |
| `pnpm audit --prod`                         | PASS, no known vulnerabilities                                          |
| `git diff --check`                          | PASS                                                                    |

The initial format check failed; final formatting passed without weakening verification. The Next build warns that its ESLint plugin is not detected; repository ESLint still runs successfully. Test subprocesses emit a Node experimental web-storage warning; no browser hydration failure was observed in the actual rendered homepage check.

Security checks found no configured provider credentials in 76 built frontend/extension files. The tracked-file scan's .env.example candidates were known development SESSION_SECRET and EXTENSION_TOKEN_PEPPER placeholders, not provider credentials; production must use independent high-entropy values. Extension permissions remain activeTab/storage/identity and exact local API host localhost:3001, with no all_urls. This local build is not a Chrome Store release artifact. Production mode retains its existing localhost rejection; no production release was built or claimed. No Redis/BullMQ runtime dependency was found (one historical migration comment documents nullable legacy fields). PDF route build tracing includes the font and existing brand mark.

After checks, one existing-script web server at http://localhost:3001 and one dedicated worker (worker_ready, recoveredJobs 0) were restored. The unrelated application on port 3000 was left alone. Chrome loaded the final extension build and the rendered ProspectAI homepage. This does not replace the separately recorded failed fresh analysis.

## Remaining gates

- EXTERNAL DEPENDENCY: repair local Node/Windows DNS reachability to a real allowed target. Do not substitute an IP or weaken SSRF controls.
- MANUAL/LIVE VERIFICATION: after the environment is repaired and another run is explicitly authorized, complete evidence/scoring/AI-or-truthful-PARTIAL persistence, exact API/database comparison, extension result recovery and a successful owner-authorized PDF download. Current browser tooling works; this is not a browser-automation-unavailable claim.
- Provider credits/configuration remain external if that provider returns quota/auth errors. No credits are required to test safe PARTIAL handling.
- No known unresolved code defect is hidden by a successful unit test. The end-to-end success gate is not satisfied by the failed fresh run.
