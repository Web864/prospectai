# ProspectAI local development

ProspectAI runs as a pnpm monorepo with three development processes:

- `@prospectai/web`: Next.js application and API routes on `http://localhost:3000`
- `@prospectai/extension`: Manifest V3 extension served by Vite on `http://127.0.0.1:5173`
- `@prospectai/worker`: dedicated PostgreSQL-backed analysis worker

PostgreSQL is the only V1 stateful infrastructure dependency. `AnalysisJob` rows form the durable queue; Redis and BullMQ are not used.

## Prerequisites

- Node.js 22 or newer
- pnpm 10.15.1 or newer
- PostgreSQL reachable through a `postgresql://` or `postgres://` URL
- Chrome or another Chromium browser for extension testing

## First-time setup

From the repository root:

```powershell
pnpm install --frozen-lockfile
Copy-Item .env.example .env
```

Set `DATABASE_URL` to a reachable PostgreSQL database. Replace other placeholders only when exercising their owning capability. `.env` and local variants are ignored by Git; `.env.example` must contain placeholders only.

Prepare the database:

```powershell
pnpm prisma:generate
pnpm prisma:validate
pnpm prisma:migrate:status
pnpm prisma:migrate:dev
```

Migrations must remain executable from an empty PostgreSQL database. The initial migration creates
the legacy-compatible `AnalysisJob` table; the following PostgreSQL queue migration adds leasing,
retry, progress, and usage-reservation columns and constraints. Review generated migration SQL before
committing it, and run the database package tests to catch malformed or reordered migration files.

## Start the stack

With `DATABASE_URL` configured:

```powershell
pnpm dev
```

This starts the web application, extension watcher, and PostgreSQL worker. The worker logs `worker_ready` after connecting and recovering abandoned leases. Stop the process group with `Ctrl+C`.

Processes can run independently:

```powershell
pnpm dev:web
pnpm dev:extension
pnpm dev:worker
```

## PostgreSQL analysis queue

The local and production V1 flow is:

```text
Web/API
  -> PostgreSQL AnalysisJob
  -> Dedicated Worker
  -> Crawler / Analysis / AI
  -> PostgreSQL Results
```

The API reserves usage and inserts a job in one serializable transaction. PostgreSQL advisory locks serialize capacity checks by organization and feature. Workers claim due rows with `FOR UPDATE SKIP LOCKED`, fence updates with `lockedBy` plus `attempt`, store progress in the row, and schedule bounded retries through `nextAttemptAt`. Stale leases are recovered automatically.

Worker tuning values are optional:

- `WORKER_POLL_INTERVAL_MS`: idle polling delay, default `1000`
- `WORKER_LOCK_TIMEOUT_MS`: stale lease threshold, default `300000`
- `WORKER_RECOVERY_INTERVAL_MS`: abandoned-job scan interval, default `60000`
- `WORKER_ID`: explicit instance identity; defaults to hostname and process ID

## Chrome extension

While `pnpm dev:extension` is running:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Select Load unpacked.
4. Choose `apps/extension/dist`.
5. Pin ProspectAI and open it on a public `http` or `https` website tab.

Vite serves popup and service-worker updates through its development server. Reopen the popup after UI edits. Reload the extension after manifest or service-worker lifecycle changes.

After analysis submission, the extension polls `GET /api/v1/analysis-jobs/:jobId`. The endpoint resolves a hashed extension bearer token or hashed web session, derives the authoritative organization, and returns only that tenant's job.

## API and worker behavior

The backend is implemented as Next.js route handlers. `GET /api/health/live` is the liveness check. Job progress is served with `Cache-Control: private, no-store`.

The crawler and result-persistence pipeline remains explicitly unavailable until its real adapters are configured. The worker records such failures and bounded retries in PostgreSQL rather than reporting mock success.

## Environment scopes

All processes load root `.env`. Configuration is validated only when its capability starts:

- `DATABASE_URL`: Prisma, API persistence, and worker queue
- `SESSION_SECRET`, `EXTENSION_TOKEN_PEPPER`: web sessions and extension polling authentication
- `OPENAI_API_KEY`: AI provider adapter
- `RESEND_API_KEY`: email provider adapter
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`: billing adapter
- `NEXT_PUBLIC_*`: browser-visible web URLs
- `VITE_*`: browser-visible extension URLs

Never put secrets in `NEXT_PUBLIC_*` or `VITE_*` values.

## Verification

```powershell
pnpm lint
pnpm typecheck
pnpm format:check
pnpm test
pnpm --filter @prospectai/web build
pnpm --filter @prospectai/extension build
pnpm --filter @prospectai/worker build
```

## Troubleshooting

- Prisma or the worker reports `DATABASE_URL` missing: configure the root `.env` and restart the command.
- The worker cannot connect: verify the PostgreSQL host, TLS options, credentials, migration status, and network access.
- Jobs remain active after a worker stops: wait for the lock timeout and recovery interval, or restart a worker to run recovery immediately.
- Port 3000 is occupied: stop the existing listener. If another port is intentional, update all `NEXT_PUBLIC_*` and `VITE_*` URLs together.
- The extension cannot reach Vite: keep `pnpm dev:extension` running and reload the unpacked extension.
- Node 25 emits a Web Storage warning: use the repository web scripts, which disable Node's incomplete server-side implementation without changing browser storage.
