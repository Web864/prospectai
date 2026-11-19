# Building the extension for your deployed site

`pnpm build` (and `pnpm --filter @prospectai/extension build`) produces a **local-development** build. It talks to
`http://localhost:3000`, so on any machine without the app running locally the popup cannot reach the
backend and nothing works. This is the most common reason the extension "does not work" after deploying.

## Steps

1. Deploy the web app (Vercel root directory `apps/web`) and note its HTTPS origin, e.g. `https://your-app.vercel.app`.
2. In Vercel, set `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_API_BASE_URL` to that origin (and `…/api/v1`). The
   extension's sign-in link is built from `NEXT_PUBLIC_APP_URL`, so a wrong value sends users to localhost.
3. Build the extension against it:

   ```bash
   VITE_APP_URL=https://your-app.vercel.app \
   VITE_API_BASE_URL=https://your-app.vercel.app/api/v1 \
   pnpm --filter @prospectai/extension build:production
   ```

   Production mode refuses localhost and non-HTTPS URLs, and sets the manifest host permission to that origin.

4. Open `chrome://extensions`, enable Developer mode, **Remove** any older ProspectAI extension, then
   **Load unpacked** and choose `apps/extension/dist`. Reloading an old copy keeps the old URL.

## Quick checks

- Open the popup, right-click, **Inspect**, and watch the Network tab: requests must go to your domain, not localhost.
- `apps/extension/dist/manifest.json` → `host_permissions` must list your domain.
- Sign-in uses Chrome's identity redirect (`https://<extension-id>.chromiumapp.org/`); the API already accepts it.
