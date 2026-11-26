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

## Publishing to the Chrome Web Store

Do these only after the web app is deployed and working on its final HTTPS domain, because the domain is baked
into the extension build and cannot be changed without publishing a new version.

1. **Build** with the final domain (see above), then zip the _contents_ of `apps/extension/dist` so that
   `manifest.json` sits at the top level of the zip.
   - Windows PowerShell: `Compress-Archive -Path apps\extension\dist\* -DestinationPath prospectai-extension.zip`
   - macOS/Linux: `cd apps/extension/dist && zip -r ../../../prospectai-extension.zip .`
2. **Developer account:** register at the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   (one-time US$5 fee).
3. **New item → upload the zip.** Raise the `version` in `apps/extension/manifest.config.ts` for every later update.
4. **Store listing:** name, short description (up to 132 characters), longer description, category, at least one
   1280x800 screenshot of the real popup, and a 440x280 promo tile. The 128x128 icon is already in the zip.
5. **Privacy tab:** single purpose = "analyze the active website and show prospect intelligence". Justify each
   permission: `activeTab` (read the current page URL when the user clicks), `storage` (keep the session),
   `identity` (sign-in window), and the host permission (talk to the ProspectAI API). Link the privacy policy at
   `https://<your-domain>/privacy`.
6. **Distribution:** start with _Unlisted_ or _Trusted testers_, install it from the Store, run sign-in and an
   analysis, then switch to _Public_ and submit for review (usually a few days).

See `chrome-web-store-plan.md` for the full policy checklist.
