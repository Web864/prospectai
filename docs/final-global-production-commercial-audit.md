# ProspectAI — Final Global Production, SEO, UX & Commercial Audit

Audit date: 2026-11-26. Branch: `claude/project-thread-5sj0i4` (from `main` at `4e077c0`).

Evidence labels used throughout: **VERIFIED** (checked in this audit against the current code or a running build), **NOT VERIFIED**, **ENVIRONMENT BLOCKER**, **EXTERNAL DEPENDENCY**, **REQUIRES LEGAL REVIEW**.

## Executive Verdict

**YELLOW — launchable as a free beta once the deployment checklist below is done; do not charge customers until the external and legal items are closed.**

The core code is in good shape: tenant isolation held in a live cross-account test, the crawler's SSRF protection is strong, the queue is solid, and the launch-blocking code problems this audit found are fixed and tested. Those were a critical Next.js remote-code-execution advisory, rate limits that would have become one global bucket on Vercel, a Google sign-in account-takeover path, a fragile Stripe webhook, signup breaking when email is down, and no SEO foundation.

It is not GREEN because nothing in production exists yet. That covers the database, worker host, domain, Stripe, Resend, Google OAuth and the Chrome Web Store listing. The legal pages are drafts, pricing has no prices, and an end-to-end analysis of a real website could not be run here because the sandbox has no DNS.

## Product Summary

ProspectAI analyzes a public business website, records rule-based findings with stored evidence (technical, SEO, accessibility, mobile, trust, conversion, performance, content), calculates deterministic website and opportunity scores, optionally adds AI interpretation, and turns the result into opportunities, saved leads, pitch drafts and a PDF report. Surfaces: marketing site, Next.js workspace, Manifest V3 Chrome extension (with a 3-analysis guest trial).

## Current Architecture

- pnpm monorepo, Node 22. `apps/web` (Next.js 15.5 App Router, route handlers under `/api/v1`), `apps/worker` (persistent Node process), `apps/extension` (Vite + CRXJS, MV3).
- Packages: `analysis` (PostgreSQL job queue with `FOR UPDATE SKIP LOCKED`, leases, fencing, retries, idempotent usage ledger), `crawler` (pinned-IP HTTP fetcher, SSRF guard, site crawl), `scoring`, `ai` (OpenAI-compatible provider, Gemini via OpenAI endpoint), `auth`, `billing` (Stripe), `config` (zod env), `database` (Prisma, 6 migrations), `validation`, `shared`, `types`, `ui`.
- Queue is the database (ADR 0002). No Redis. Worker must run on a persistent host, not Vercel.

## Current Route Inventory

Public, indexable, now **statically prerendered** (VERIFIED in build output): `/`, `/how-it-works`, `/features`, `/pricing`, `/faq`, `/resources`, `/contact`, `/privacy`, `/terms`, plus `/robots.txt`, `/sitemap.xml`.

Private, `noindex` (meta + `X-Robots-Tag`, VERIFIED): `/login`, `/signup`, `/verify-email`, `/forgot-password`, `/reset-password`, `/onboarding`, `/extension/connect`, `/app`, `/app/{dashboard,overview,research,analyses,analysis/:id,opportunities,prospects,leads,leads/:id,pitches,pitches/new,usage,billing,settings,settings/extension,profile,integrations,reports}`.

Unknown URLs now return **HTTP 404** (previously a soft 404 with status 200, VERIFIED with curl, including Googlebot user agent).

API: 41 route handlers (`/api/v1/*`, `/api/webhooks/stripe`, `/api/health/live`, new `/api/health/ready`).

## Global Research Performed

- Google Search Central: FAQ rich results were restricted to authoritative government/health sites in Aug 2023, and the press now reports them as dropped entirely. FAQPage markup is therefore **not** added ([Google](https://developers.google.com/search/blog/2023/08/howto-faq-changes), [FAQPage docs](https://developers.google.com/search/docs/appearance/structured-data/faqpage), [SEJ](https://www.searchenginejournal.com/google-drops-faq-rich-results/574429/)).
- Vercel request headers: Vercel overwrites `x-forwarded-for` and sets `x-vercel-forwarded-for`/`x-real-ip`, so they are trustworthy on Vercel ([Vercel docs](https://vercel.com/docs/headers/request-headers)). The rate-limit fix relies on this.
- Adjacent products checked for the quality bar: My Web Audit, SignalizeAI, Prospect WP, AuditLens AI, TrackingSuite, Apify "Agency Website Opportunity Audit" ([Chrome Web Store: My Web Audit](https://chromewebstore.google.com/detail/my-web-audit/fmjkhlnfjdeknelfokepacbinhedgbjd), [SignalizeAI](https://chromewebstore.google.com/detail/signalizeai/nhgeihbbpdnhcfccedpnkionaofdpaib), [Prospect WP](https://chromewebstore.google.com/detail/iciplccniikaehcacadefafkmdjdgiea), [AuditLens AI](https://chromewebstore.google.com/detail/gjbfenejbabiioobgdihmljmocghhhji), [Apify](https://apify.com/digital-ai-lab.de/agency-website-opportunity-audit)).
- `pnpm audit --prod` against the npm advisory database (results below).
- Keyword volumes, CPC and difficulty: **NOT VERIFIED.** No keyword tool (Ahrefs, Semrush, Google Keyword Planner) was available, so no numbers are claimed.

## Website / Marketing Audit

| Page                 | H1                                                      | Status before                                                    | Status now                                                                                                                      |
| -------------------- | ------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `/`                  | Know the business. Find your angle. Win better clients. | Generic title "ProspectAI" shared by every page                  | Unique title/description, canonical, OG, Organization/WebSite/SoftwareApplication JSON-LD                                       |
| `/how-it-works`      | A focused path from prospect to pitch                   | Rendered dynamically                                             | Static, metadata, breadcrumb                                                                                                    |
| `/features`          | From website signals to credible sales opportunities    | 3 vague cards, all linking to `/#how`                            | Concrete copy matching real checks; links to real pages                                                                         |
| `/pricing`           | Start free, scale when prospecting works                | No prices, no allowances                                         | Monthly analysis allowances shown (from env). **Prices still missing: EXTERNAL DEPENDENCY** (Stripe prices are not in the repo) |
| `/faq`               | Questions, answered plainly                             | OK                                                               | Metadata added                                                                                                                  |
| `/resources`         | was "Talk to the ProspectAI team"                       | Wrong H1; duplicated the features cards (duplicate/thin content) | Correct H1, three distinct practical guides                                                                                     |
| `/contact`           | Contact ProspectAI                                      | **Form posted to nowhere** (no handler)                          | Honest page; `mailto:` from `SUPPORT_EMAIL`                                                                                     |
| `/privacy`, `/terms` |                                                         | One placeholder paragraph                                        | Substantive drafts describing actual data handling, clearly labeled "Draft pending legal review"                                |

Navigation previously pointed to homepage anchors (`/#how`, `/#features`, `/#audiences`, `/#faq`) even though real pages existed. It now links to independent pages, and a browser test verified that a nav click changes the URL and Back works. Fake social icons with no links were removed from the footer; "About" (which linked to Contact) was relabeled.

Design: the marketing site is restrained and professional (light theme, teal accent, no neon or glassmorphism). Screenshots at 1440 and 390 px showed no layout breakage. Remaining weakness: the site is still thin on proof. There are no customer logos, testimonials, real example report, or prices (P2, content work).

## Design / UX Audit

Workspace screens (dashboard, analyses, research, leads, opportunities, pitches, usage, billing, settings, extension, onboarding) were loaded signed-in, in both themes at 1440/1024/768/390. Result: exactly one H1 per screen, no horizontal overflow, no console errors (VERIFIED, Playwright). Visual quality of the workspace is good (see screenshots taken during the audit).

Observed minor issues (not fixed, P3): the dashboard "Analyses this period" count includes failed analyses, while usage counts only consumed ones. The top-bar bell and help buttons have no visible function.

## Responsive Audit

Automated overflow check across all public pages and 11 app routes at 1440/1024/768/390: no horizontal scroll (VERIFIED). 430 px and 1280 px were not separately checked (NOT VERIFIED; bracketed by the tested sizes).

## Accessibility Audit

- One H1 per page, landmark navigation labels, skip-free but semantic layout (VERIFIED by tests and Playwright).
- The mobile menu uses `<details>`, which is keyboard accessible.
- No full WCAG audit with a screen reader or axe was run (NOT VERIFIED).

## Light/Dark Theme Audit

Workspace dark theme renders coherently (VERIFIED by screenshot). The marketing site is light-only by design. It has no toggle, and the stored preference only affects the workspace. The theme bootstrap ignores `prefers-color-scheme` (P3, deliberate: the marketing CSS has not been verified in dark).

## SEO Audit

Before: every page had title "ProspectAI" and description "Prospect opportunity intelligence."; there was no canonical, Open Graph, robots.txt, sitemap or structured data; auth and app pages were indexable; unknown URLs returned 200.

Now (all VERIFIED on the production build):

- Unique title (template `%s | ProspectAI`) and description per public page, from one registry (`apps/web/lib/site-metadata.ts`).
- `metadataBase` from `NEXT_PUBLIC_APP_URL`, so canonical and OG URLs are absolute.
- `robots.txt` (disallows `/app`, `/api/`, `/onboarding`, `/extension/`) and `sitemap.xml` (9 public URLs).
- `noindex` on all private surfaces, real 404s.
- Public pages statically prerendered (fast TTFB, cacheable).

## Keyword Research

No keyword tool was available, so **volumes, CPC and difficulty are NOT VERIFIED**. The strategy below is based on intent and relevance only. Validate it with Google Keyword Planner or Search Console data after launch.

Your brief suggested "AI consultancy / AI agency / automate my business". I recommend **against** targeting those as primary terms. They describe services ProspectAI's _users_ sell, not what ProspectAI is, so ranking for them would attract buyers of AI consulting who will not convert. They are useful as blog topics aimed at agencies, which is ProspectAI's audience.

| Priority | Topic / keyword                                                 | Intent                     | Relevance                                                 | Page                                   |
| -------- | --------------------------------------------------------------- | -------------------------- | --------------------------------------------------------- | -------------------------------------- |
| High     | website audit tool for agencies                                 | Commercial                 | Direct                                                    | `/features`                            |
| High     | website audit for prospecting / sales prospecting website audit | Commercial                 | Direct                                                    | `/`                                    |
| High     | find clients for web design / SEO agency                        | Informational → commercial | Core audience pain                                        | Blog/resources                         |
| High     | AI prospecting tool (website-based)                             | Commercial                 | Direct                                                    | `/`                                    |
| Medium   | personalized cold email from website audit                      | Informational              | Pitch feature                                             | `/how-it-works` + guide                |
| Medium   | website audit report PDF for clients                            | Commercial                 | PDF feature                                               | `/features`                            |
| Medium   | chrome extension website audit                                  | Transactional              | Extension                                                 | Chrome Web Store listing + `/features` |
| Medium   | how to pitch SEO services to local businesses                   | Informational              | Audience                                                  | Resources guide                        |
| Low      | AI consultant / AI agency / business automation                 | Commercial (wrong buyer)   | Indirect                                                  | Blog only, written for agencies        |
| Low      | generic "SEO audit", "website checker"                          | Transactional              | Dominated by free tools; ProspectAI is not a free checker | Avoid                                  |

## Keyword-to-Page Mapping

`/` takes "AI prospecting tool / website intelligence for prospecting". `/features` takes "website audit tool for agencies". `/how-it-works` takes "turn a website audit into a sales pitch". `/pricing` is for branded and pricing queries. `/resources` (future blog) takes informational agency-growth topics, one article per topic, so no two pages target the same query.

## Technical SEO

Done: sitemap, robots, canonical, noindex, 404 status, HTTPS headers (HSTS when the app URL is https), static rendering, `lang="en"`, viewport.
Open: www/non-www and trailing-slash redirects are configured at the domain level in Vercel (EXTERNAL DEPENDENCY). There is no OG image yet, so social shares fall back to no image (P2). Core Web Vitals in the field are NOT VERIFIED.

## AEO Audit

The homepage and FAQ answer "what is it / who is it for / is it guaranteed" in plain sentences, and the new meta descriptions state the entity definition explicitly. Headings are question-based where natural. No artificial FAQ blocks were added.

## GEO Audit

Entity clarity improved. One consistent definition (`siteDescription`) is used in the meta description, the Organization/SoftwareApplication JSON-LD and the OG tags. There is still no verifiable evidence (case studies, a sample report, a founder or author page, third-party mentions), and that is the biggest gap for generative engines. Citation by any AI system is not promised.

## Schema Audit

Added: Organization, WebSite, SoftwareApplication (home); BreadcrumbList (each public page). JSON-LD output is escaped (`<` encoded). Deliberately **not** added: FAQPage (rich results discontinued), `offers`/`aggregateRating` (no verified prices or reviews; adding them would be fabricated). Validation with Google's Rich Results Test is NOT VERIFIED (it needs a public URL).

## Off-Page SEO Strategy

Off-page work has not started (no domain yet). Ethical plan:

1. Chrome Web Store listing (a backlink plus discovery).
2. Product Hunt and SaaS directories relevant to agencies (G2, Capterra, AlternativeTo) once there are users.
3. Founder content: case-style posts that show anonymized real analyses, on LinkedIn and agency communities.
4. Guest posts for agency and freelancer publications on "pitching with evidence".
5. Consistent name, URL and description across every profile.

No link buying.

## Content / Blog Audit

There is no blog. The brief asks for one "if the existing product scope includes it", and the current scope does not. Building a blog plus CMS now would be new architecture with no content to fill it. Recommendation: add an MDX-based `/blog` in the repo once the first 3–5 genuinely useful articles exist (P2). This needs no database or admin surface, gives Article schema and RSS easily, and adds no security exposure.

## Content Management Audit

No CMS exists. Marketing copy lives in components, and the page registry is in `lib/site-metadata.ts`. For a single founder-led team, editing in Git (with Vercel previews) is the safest and cheapest option. A database-backed admin CMS would add an authenticated write surface for little gain. **Recommendation: no CMS now.** Revisit with a headless CMS only if non-developers must publish frequently.

## Chatbot Audit

No visitor chatbot exists. It is not required for the current product and would add cost, abuse and hallucination risk. **Not added.** If one is wanted later, it must answer only from the FAQ and page content, with rate limiting.

## Authentication Audit

- scrypt password hashing with timing-safe compare; opaque 256-bit tokens stored as peppered SHA-256; HttpOnly SameSite=Lax session cookie, `Secure` in production; single-use, expiring reset and verification tokens with compare-and-set (VERIFIED, code + tests).
- **Fixed (P1):** Google sign-in marked an existing unverified account verified while keeping its password. An attacker could pre-register a victim's email with a password, wait for the victim to sign in with Google, and then use the password. The unverified password, sessions and extension sessions are now discarded on link (tests added).
- **Fixed (P1):** signup returned an error after creating the account whenever the email provider failed, leaving the user locked out of signup. Signup now succeeds and logs the email failure (VERIFIED live).
- **Fixed:** per-account login (10/15 min) and reset-email (3/h) limits.
- Open (P2): email verification is never enforced, and there is no "resend verification" endpoint.

## Authorization / Tenant Isolation

Every data route scopes by `actor.organizationId`. Live test with two accounts on the production build (VERIFIED): user B gets 404 for user A's analysis, report, job and PDF, sees an empty analysis list, and cannot cancel A's job. Unauthenticated access returns 401. Guest routes additionally scope by guest session.

## API Audit

- Consistent error envelope with request id; no stack traces returned (VERIFIED by existing tests).
- **Fixed:** JSON bodies are capped at 256 KB (413) before validation.
- **Fixed (P0):** rate-limit identity. With the default `TRUST_PROXY=false`, every client shared one bucket. On Vercel that meant 10 logins per 15 minutes _for the whole site_, and a single abuser could lock everyone out of signup, login and guest trials. Vercel's client-IP headers are now trusted automatically when `VERCEL=1` (tests added).
- **Fixed:** extension refresh endpoint is now rate limited.
- Open (P3): list endpoints cap at 100 rows without cursor pagination.

## Database Audit

Six migrations apply cleanly to an empty PostgreSQL 16 and `migrate status` is up to date (VERIFIED). Schema has CHECK constraints, a partial claim index and unique idempotency keys. **Fixed:** `RateLimitBucket` and spent `AuthActionToken` rows were never deleted, so the tables grew with every request. Hourly maintenance now prunes them.

## Database Cost Strategy

Current prices and free-tier limits were not re-verified today (NOT VERIFIED). Check them before choosing.

- **Self-hosted PostgreSQL on a VPS**: the lowest recurring cost, but you own backups, PITR, patching, failover and security. That conflicts with being a one-person SaaS that takes payments.
- **Free tiers (Neon, Supabase)**: fine for preview environments. They impose storage limits, connection limits and/or project pausing, and they offer limited restore windows.
- **Recommendation:** a managed PostgreSQL with automated backups and point-in-time restore on its lowest paid tier for production. Neon fits Vercel well (pooled plus direct URLs). Supabase or the worker host's own PostgreSQL (Railway/Render) are fine too. Use a free tier for preview and local Docker for development. The "no recurring DB fee" goal is met for dev/preview only; for production, backups are worth the small fee.

## Crawler / SSRF Audit

VERIFIED by code read and 73 crawler tests:

- Blocks localhost, private and reserved IPv4, IPv6 ULA, link-local, site-local, multicast, NAT64, Teredo, 6to4 and IPv4-mapped addresses, and metadata hosts and addresses. Only ports 80 and 443 are allowed, and URLs with credentials are rejected.
- Connections are pinned to the validated IP (no DNS-rebinding window), and every redirect is re-validated (max 5).
- Responses are capped at 2 MB, measured after decompression by the bounded reader. Timeouts apply.

A real external crawl could not run here because the sandbox has no DNS (**ENVIRONMENT BLOCKER**). The job correctly failed with `WEBSITE_UNREACHABLE` and the usage reservation was released (VERIFIED).

## Analysis Engine Audit

Rule-based findings cover HTTPS, title, meta description, heading hierarchy, viewport, `lang`, alt text, CTA, contact path, OG metadata, response time, repeated metadata, and per-page accessibility counts. Scores are deterministic (ADR 0004). AI is optional and degrades to partial results. Marketing copy claiming "tech stack" detection is not backed by a detector (P3 wording issue in `marketing-views.tsx`).

## Queue / Worker Audit

Lifecycle, leases, fencing, stale recovery, retries and idempotent usage were VERIFIED by 28 queue tests and a live job run. **Fixed (P1):** any database error in the worker loop crashed the process, which then depended entirely on the host restarting it. The loop now logs and backs off (up to 30 s) and keeps going. **Fixed:** guest-data maintenance existed but was never scheduled; the worker now runs it hourly. The previously known problems (missing worker, mixed-case identifiers, fake progress, duplicate jobs, usage mismatch) did not reappear in tests or the live run.

## AI Audit

The provider abstraction validates output and treats page content as untrusted (existing security tests pass). Pitch generation is rate limited (10/min/org) and requires a configured provider. AI cost per analysis and the behavior of a live provider are NOT VERIFIED (no API key; EXTERNAL DEPENDENCY).

## Chrome Extension Audit

A production build with an HTTPS API URL (VERIFIED) contains no localhost endpoints (only validation code mentions localhost). Permissions are minimal (`activeTab`, `storage`, `identity`, a single host permission) and the CSP is strict. **Fixed (P2):** any extension could receive authorization codes via its own `*.chromiumapp.org` redirect. Set `EXTENSION_ALLOWED_IDS` to the published extension ID to pin it. The extension was not loaded into Chrome against a live server (NOT VERIFIED).

## PDF / Reporting Audit

PDFs are generated from persisted analysis rows, scoped by org (and by guest session for guests), and refused for non-completed analyses (409, VERIFIED live). Cross-tenant PDF access returns 404 (VERIFIED). The rendering tests pass. Visual review of a real PDF was not repeated (covered by the earlier PR; NOT VERIFIED today).

## Stripe / Billing Audit

Checkout and portal are owner-only, origins are validated, idempotency keys are used, and the client is never trusted for plan state. **Fixed (P1) in the webhook:**

- The status was taken from event payloads, so out-of-order delivery could reactivate a canceled subscription. It now re-reads the subscription from Stripe on every event.
- Unknown and paused statuses defaulted to ACTIVE; they now fail closed.
- Invoices in the 2025+ payload shape were missed; they are now handled.
- Processing errors returned 400; they now return 503 so Stripe retries.
- The plan is derived from the configured price ID.

Six new tests cover this. Real checkout, portal and webhook delivery are NOT VERIFIED (EXTERNAL DEPENDENCY: Stripe account).

## Email Audit

Resend adapter, single-use expiring tokens. **Fixed:** a 10 s timeout, and network failures are mapped to a clean 502. Production refuses to run without a real provider. Delivery, SPF/DKIM/DMARC and the sender domain are NOT VERIFIED (EXTERNAL DEPENDENCY). Emails are plain text (P3).

## Performance Audit

Public pages are now static (about 111 kB first-load JS). The app catch-all is about 152 kB. Fonts are self-hosted woff2. Lighthouse and field CWV were not measured (NOT VERIFIED).

## Reliability Audit

| Failure                         | Behavior                                                                   |
| ------------------------------- | -------------------------------------------------------------------------- |
| Web restart                     | Stateless; sessions live in the DB                                         |
| Worker restart / deploy mid-job | Lease expires, job is recovered and retried (tests)                        |
| Database down                   | Web returns retryable 503; worker now backs off instead of exiting (fixed) |
| AI down                         | Partial result                                                             |
| Crawler failure                 | Classified errors; usage released (VERIFIED live)                          |
| Email down                      | Signup still succeeds (fixed)                                              |
| Stripe webhook failure          | 503 → Stripe retries (fixed)                                               |

## Observability Audit

Structured JSON logs with request ids. **Added:** `/api/health/ready`, which returns 503 when the database is unreachable or the oldest queued job is older than 5 minutes, so you can tell when no worker is running (VERIFIED live). Still needed: an uptime monitor on that endpoint, log drain/alerts, and error tracking (EXTERNAL DEPENDENCY).

## Vercel / Hosting Audit

`apps/web/vercel.json` sets the monorepo install and build commands. Set the Vercel root directory to `apps/web`. Required env: `DATABASE_URL` (pooled), `NEXT_PUBLIC_APP_URL` (https production domain), `NEXT_PUBLIC_API_BASE_URL`, the three peppers and secrets, `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `EMAIL_FROM`, `SUPPORT_EMAIL`, the Stripe keys and prices, Google OAuth, the AI key, and `EXTENSION_ALLOWED_IDS`. `TRUST_PROXY` is not needed on Vercel. The worker goes on Railway, Render or Fly using `apps/worker/Dockerfile`, with automatic restart.

## Production Infrastructure Audit

None of the production infrastructure exists yet (EXTERNAL DEPENDENCY): domain, Vercel project, managed DB with backups, worker host, monitoring.

## Legal / Trust Readiness

| Item                                                                       | Status                                                                                                        |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Privacy policy                                                             | Draft describing real behavior — **REQUIRES LEGAL REVIEW**                                                    |
| Terms                                                                      | Draft — **REQUIRES LEGAL REVIEW**                                                                             |
| Processing third-party contact data found on crawled sites (emails/phones) | **REQUIRES LEGAL REVIEW** (GDPR/CAN-SPAM implications for outreach)                                           |
| Account/data deletion                                                      | Manual via support email — NEEDS IMPLEMENTATION for self-service                                              |
| Cookies                                                                    | Only essential auth cookies; no analytics — READY (no banner needed for essential cookies, subject to review) |
| AI disclosure                                                              | In privacy draft and homepage disclaimer — READY                                                              |
| Refund policy                                                              | Missing — NEEDS IMPLEMENTATION / legal decision                                                               |
| Support contact                                                            | Needs `SUPPORT_EMAIL` set — NEEDS IMPLEMENTATION (config)                                                     |

## Commercial / Selling Readiness

"If I charged a real customer today, would it feel finished?" **Not yet.** The workspace looks professional and the core is sound. But a buyer would hit pricing with no prices, legal pages marked draft, no proof (sample report, testimonials) and no published support address. Fix those and the product is a credible paid beta.

## Competitive Assessment

| Area                                                    | Position                                          |
| ------------------------------------------------------- | ------------------------------------------------- |
| Evidence-backed findings with commercial interpretation | ADVANTAGE (most audit extensions show raw checks) |
| Deterministic, explainable scoring                      | ADVANTAGE                                         |
| Security (SSRF, tenant isolation)                       | ADVANTAGE / parity                                |
| Pitch generation from evidence                          | PARITY                                            |
| PDF client reports                                      | PARITY                                            |
| Contact enrichment / CRM sync                           | BEHIND (intentionally out of scope; do not chase) |
| Social proof, published pricing, content                | MISSING                                           |

## Issues Found

| ID  | Sev | Area             | Evidence                                                                      | Root cause                                           | Fix                                                        | Implemented | Verification                        | Remaining                             |
| --- | --- | ---------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------- | ----------- | ----------------------------------- | ------------------------------------- |
| A1  | P0  | Dependencies     | `pnpm audit`: next ≤15.5.27 critical RCE (image optimizer) + 5 others         | Outdated pin                                         | next 15.5.29                                               | Yes         | Audit clean for next; build passes  | —                                     |
| A2  | P0  | Rate limiting    | `rate-limit.ts` returned `'direct-client'` for all callers unless TRUST_PROXY | No trusted client IP on Vercel                       | Trust Vercel headers when `VERCEL=1`                       | Yes         | 3 unit tests                        | Set `TRUST_PROXY` on non-Vercel hosts |
| A3  | P1  | Auth             | `findOrCreateGoogleAccount` verified email but kept unverified password       | Missing pre-account-takeover defense                 | Clear password, revoke sessions                            | Yes         | 2 unit tests                        | —                                     |
| A4  | P1  | Billing          | Webhook trusted event payload status; default ACTIVE; 400 on processing error | Event-driven state without resync                    | Retrieve subscription, fail closed, 503                    | Yes         | 6 unit tests                        | Live Stripe test                      |
| A5  | P1  | Auth             | Live: signup → 503 after user row created                                     | Email send inside success path                       | Catch, log, still 201                                      | Yes         | Live curl                           | —                                     |
| A6  | P1  | Worker           | Uncaught DB error in loop exits process                                       | No loop-level error handling                         | Backoff and continue                                       | Yes         | Typecheck/tests; not chaos-tested   | —                                     |
| A7  | P1  | Ops              | Maintenance script never scheduled; buckets/tokens never pruned               | No scheduler                                         | Hourly in worker; prune tables                             | Yes         | Live log `maintenance_completed`    | —                                     |
| A8  | P1  | SEO              | Same title/description on all pages; no canonical/robots/sitemap/schema       | Never implemented                                    | Metadata registry, robots, sitemap, JSON-LD                | Yes         | Playwright + curl                   | Submit to Search Console              |
| A9  | P1  | Website          | Nav linked to homepage anchors                                                | Design choice conflicting with requirement           | Independent page links                                     | Yes         | Unit + browser test                 | —                                     |
| A10 | P1  | Website          | Contact form had no handler                                                   | Placeholder                                          | mailto via `SUPPORT_EMAIL`                                 | Yes         | Build                               | Set `SUPPORT_EMAIL`                   |
| A11 | P1  | Legal            | Privacy/terms were a single placeholder paragraph                             | Not written                                          | Factual drafts                                             | Partly      | Screenshot                          | REQUIRES LEGAL REVIEW                 |
| A12 | P1  | Security headers | No CSP/HSTS                                                                   | Not configured                                       | CSP (with `unsafe-inline` for Next scripts), HSTS on https | Yes         | curl headers; no console CSP errors | Consider nonces later                 |
| A13 | P2  | SEO              | Soft 404 (200) for unknown URLs                                               | Catch-all `loading.tsx` streamed before `notFound()` | Remove loading boundary; notFound in metadata              | Yes         | curl 404                            | —                                     |
| A14 | P2  | SEO/Perf         | Public pages rendered dynamically                                             | Single catch-all with `searchParams`                 | Dedicated static routes                                    | Yes         | Build shows ○ static                | —                                     |
| A15 | P2  | Content          | Resources H1 wrong, duplicated features                                       | Copy placeholder                                     | Rewritten                                                  | Yes         | Screenshot                          | More real content                     |
| A16 | P2  | Extension        | Any `*.chromiumapp.org` accepted as redirect                                  | Generic check                                        | `EXTENSION_ALLOWED_IDS` pin                                | Yes         | 3 unit tests                        | Set ID in prod                        |
| A17 | P2  | API              | No JSON body size limit; zod advisory (<4.6.6) unpatched in 3.x               | —                                                    | 256 KB cap                                                 | Mitigated   | Unit test                           | Migrate zod 3→4                       |
| A18 | P2  | Deps             | undici, effect, qs advisories                                                 | Transitive                                           | pnpm overrides                                             | Yes         | Audit                               | —                                     |
| A19 | P2  | CI               | `homepage.test.tsx` failing; `format:check` failing on homepage               | Content changed without tests                        | Tests updated; formatted                                   | Yes         | Full suite green                    | —                                     |
| A20 | P2  | Auth             | No email verification enforcement or resend                                   | Not built                                            | —                                                          | No          | —                                   | Decide policy                         |
| A21 | P2  | Legal            | No self-service account deletion                                              | Not built                                            | —                                                          | No          | —                                   | Implement before paid launch          |
| A22 | P2  | Commercial       | No prices, no proof, no OG image                                              | Content/external                                     | —                                                          | No          | —                                   | Owner action                          |
| A23 | P3  | Repo             | `docs/ProspectAI_Codex_Handoff.zip` (4 MB) committed despite `*.zip` ignore   | Added before ignore rule                             | —                                                          | No          | —                                   | Consider removing                     |
| A24 | P3  | UX               | Dashboard counts failed analyses; decorative bell/help buttons                | —                                                    | —                                                          | No          | —                                   | Polish                                |

## Fixes Implemented

Two commits on `claude/project-thread-5sj0i4`:

- `49612d7`: auth, billing, worker, headers and SEO hardening; static public pages; content fixes.
- `31d7f46`: Next.js advisory patch, body cap, signup and email fix, real 404s.

## Tests Performed

All run fresh on the final code:

- `pnpm lint` ✓, `pnpm typecheck` ✓, `pnpm format:check` ✓.
- `pnpm test`: **274 tests passing across 12 projects** (web 85, crawler 73, extension 38, analysis 28, api 16, worker 8, ai 7, database 5, config 5, auth 4, scoring 3, validation 2). New tests: Stripe webhook (6), rate-limit identity (3), Google linking (2), extension redirect (3), body limit (1), homepage navigation.
- `pnpm prisma:validate` ✓; migrations applied to a fresh PostgreSQL 16 and `migrate status` is up to date.
- `pnpm build` (web, extension, worker) ✓; extension production build checked for dev endpoints ✓.
- `pnpm audit --prod`: 16 → 1 (zod, mitigated).
- `git diff --check` ✓.
- Live checks on the production build with a local PostgreSQL and the worker running:
  - every public page's status, title, canonical, OG, JSON-LD and H1;
  - robots and sitemap;
  - security headers;
  - 404s;
  - nav click and Back;
  - signup for two users and cross-tenant access (blocked);
  - the job lifecycle and usage release on failure;
  - readiness endpoint;
  - 11 app screens × 2 themes × 4 widths with no overflow or console errors.

## External Dependencies

Domain, Vercel, managed PostgreSQL, worker host, Stripe (products, prices, webhook endpoint), Resend (verified domain), Google OAuth client, AI provider key, Chrome Web Store developer account, uptime monitoring.

## Manual Verification Required

1. A real website analysis end to end with the AI key (ENVIRONMENT BLOCKER here: no DNS).
2. Load the extension into Chrome against the deployed API: guest trial, connect, analyze, PDF download.
3. Stripe test-mode checkout, upgrade, cancel, failed payment, and portal.
4. Email delivery for verification and reset.
5. Rich Results Test and the Search Console URL inspection on the live domain.
6. Lighthouse on the live domain.

## Production Deployment Plan

1. Create managed PostgreSQL with PITR. Run `pnpm --filter @prospectai/database exec prisma migrate deploy` with the direct URL.
2. Create the Vercel project (root `apps/web`) and set all env vars (see Vercel section). Use separate preview values.
3. Deploy the worker from `apps/worker/Dockerfile` with restart-always, `DATABASE_URL`, the AI key and the guest env.
4. Configure the domain and a redirect from the www/non-www variant to the canonical host.
5. Create the Stripe webhook endpoint at `/api/webhooks/stripe` (subscription and invoice events, checkout.session.completed).
6. Point an uptime monitor at `/api/health/ready`.

## SEO Launch Plan

1. Deploy with `NEXT_PUBLIC_APP_URL` set to the final domain, and check that canonical URLs in the page source match it.
2. Verify the domain in Google Search Console (DNS) and submit `/sitemap.xml`. Do the same in Bing Webmaster Tools (it can import from GSC).
3. Use URL Inspection to request indexing for `/`, `/features`, `/how-it-works`, `/pricing`.
4. Run the Rich Results Test on the home page.
5. Add an OG image, prices and a sample report, then the first resources articles.

Indexing timing cannot be promised.

## Chrome Web Store Launch Plan

1. Bump the version. Build with `pnpm --filter @prospectai/extension build:production` and the production `VITE_*` URLs.
2. Write the listing: single-purpose description, privacy policy URL (`/privacy` after legal review), permission justifications (`activeTab`: analyze the current site on click; `storage`: tokens and state; `identity`: sign-in handoff), data-use disclosures, and screenshots.
3. After the store assigns the ID, set `EXTENSION_ALLOWED_IDS` on Vercel.

## Customer Launch Checklist

- [ ] Production infra up (deployment plan steps 1–6)
- [ ] Legal review of privacy/terms; refund policy decided
- [ ] Prices on `/pricing` matching Stripe
- [ ] `SUPPORT_EMAIL` set
- [ ] Manual verification items 1–4 passed
- [ ] Account deletion path (at least a documented manual process; self-service preferred)
- [ ] Extension published and ID pinned
- [ ] Uptime monitoring and alerting

## Final Decision

**YELLOW.** The code-side launch blockers are fixed and tested. Remaining work is external setup, legal review and commercial content. Run it as a free beta once infrastructure is up; take payment only after the customer launch checklist is complete.

## Exact Next Action

Provision production PostgreSQL, Vercel and the worker host. Then run Manual Verification items 1–4 against the deployed stack, starting with one real website analysis with the AI key configured.
