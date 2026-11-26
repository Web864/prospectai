/*
 * Real-stack Chromium E2E for the unpacked extension. Requires: Postgres reachable through
 * psql -h /tmp -U postgres -d prospectai, `pnpm dev:web` on :3000, `pnpm dev:worker`, a static
 * page on 127.0.0.1:8099, and `pnpm build` + `node e2e/prepare.cjs`. Usage:
 *   node e2e/real-stack.e2e.cjs <prepared-extension-dir> <screenshot-dir>
 * acme-prospect.com is mapped to the local page for the browser only; the crawler resolves it
 * through real DNS, so in a sandbox without DNS the job fails with WEBSITE_UNREACHABLE, which
 * exercises the real failure path end to end.
 */
const { chromium } = require('playwright');
const repositoryRoot = require('node:path').resolve(__dirname, '../../..');
const { execSync } = require('node:child_process');
const sql = (q) =>
  execSync(`psql -h /tmp -U postgres -d prospectai -At -F '|' -c "${q.replace(/"/g, '\\"')}"`)
    .toString()
    .trim();
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const shots = process.argv[3];
(async () => {
  const ext = process.argv[2];
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    headless: true,
    viewport: { width: 1200, height: 800 },
    args: [
      `--disable-extensions-except=${ext}`,
      `--load-extension=${ext}`,
      '--host-resolver-rules=MAP acme-prospect.com 127.0.0.1:8099',
    ],
  });
  const consoleErrors = [];
  context.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');
  const site = await context.newPage();
  await site.goto('http://acme-prospect.com/');
  const openPopup = async () => {
    const pending = context.waitForEvent('page');
    await sw.evaluate(() =>
      chrome.windows.create({
        url: chrome.runtime.getURL('src/popup.html'),
        type: 'popup',
        focused: false,
        width: 380,
        height: 600,
      }),
    );
    const popup = await pending;
    popup.on('console', (m) => m.type() !== 'debug' && log('[popup console]', m.type(), m.text()));
    await popup.setViewportSize({ width: 380, height: 600 });
    await popup.waitForLoadState();
    return popup;
  };
  const text = async (p) =>
    (await p.locator('main').innerText()).replace(/\s+/g, ' ').slice(0, 260);
  const storage = () => sw.evaluate(() => chrome.storage.local.get(null));
  const badge = () => sw.evaluate(() => chrome.action.getBadgeText({}));

  // 1. Guest: page detection and ready state
  let popup = await openPopup();
  await popup.getByRole('heading', { name: 'Ready to analyze' }).waitFor({ timeout: 15000 });
  log('READY:', await text(popup));
  await popup.screenshot({ path: `${shots}/1-ready-light.png` });
  await popup.emulateMedia({ colorScheme: 'dark' });
  await popup.screenshot({ path: `${shots}/1-ready-dark.png` });
  await popup.emulateMedia({ colorScheme: 'light' });
  const jobsBefore = Number(sql('select count(*) from "AnalysisJob"'));
  // Stop the worker so the job stays queued: exercises "worker delayed" and popup recovery.
  try {
    execSync('pkill -f "src/index.ts"');
  } catch {}
  await new Promise((r) => setTimeout(r, 1500));
  log('WORKER STOPPED:', execSync('pgrep -f "src/index.ts" | wc -l').toString().trim());

  // 2. Triple click -> exactly one job
  await popup.getByRole('button', { name: /Analyze acme-prospect\.com/ }).evaluate((b) => {
    b.click();
    b.click();
    b.click();
  });
  await popup.getByRole('heading', { name: 'Analysis in progress' }).waitFor({ timeout: 15000 });
  await popup.waitForTimeout(1200);
  log('PROGRESS:', await text(popup));
  await popup.screenshot({ path: `${shots}/2-progress.png` });
  const jobsAfter = Number(sql('select count(*) from "AnalysisJob"'));
  log('JOBS CREATED BY TRIPLE CLICK:', jobsAfter - jobsBefore);
  const stored = (await storage()).activeAnalysis;
  log('STORED RECORD:', JSON.stringify(stored));
  log(
    'DB JOB:',
    sql(
      `select id,status,progress,attempt,"errorCode" from "AnalysisJob" where id='${stored.jobId}'`,
    ),
  );

  // 3. Close popup while running, check badge, reload extension (service worker + pages die)
  await popup.close();
  await new Promise((r) => setTimeout(r, 1500));
  log('BADGE WHILE CLOSED:', JSON.stringify(await badge()));
  log(
    'DB JOB AFTER CLOSE:',
    sql(`select status,progress,attempt,"errorCode" from "AnalysisJob" where id='${stored.jobId}'`),
  );
  await new Promise((r) => setTimeout(r, 35000));
  log('BADGE AFTER 35s (alarm checked):', JSON.stringify(await badge()));
  log('RECORD WHILE CLOSED:', JSON.stringify((await storage()).activeAnalysis));

  // 4. Reopen -> same job resumed, then wait for terminal state
  popup = await openPopup();
  await popup.waitForTimeout(1500);
  log('REOPENED:', await text(popup));
  const jobsAfterReopen = Number(sql('select count(*) from "AnalysisJob"'));
  log('JOBS CREATED BY REOPEN:', jobsAfterReopen - jobsAfter);
  await popup.screenshot({ path: `${shots}/2b-waiting-worker.png` });
  require('node:child_process')
    .spawn('pnpm', ['dev:worker'], {
      cwd: repositoryRoot,
      detached: true,
      stdio: [
        'ignore',
        require('node:fs').openSync(
          require('node:os').tmpdir() + '/prospectai-e2e-worker.log',
          'a',
        ),
        require('node:fs').openSync(
          require('node:os').tmpdir() + '/prospectai-e2e-worker.log',
          'a',
        ),
      ],
    })
    .unref();
  log('WORKER RESTARTED');
  for (let i = 0; i < 60; i++) {
    const t = await text(popup);
    if (!/Analysis in progress/.test(t)) break;
    await popup.waitForTimeout(2000);
  }
  log('TERMINAL:', await text(popup));
  await popup.screenshot({ path: `${shots}/3-terminal.png` });
  log(
    'DB JOB FINAL:',
    sql(
      `select status,progress,attempt,"maxAttempts","errorCode","errorMessage" from "AnalysisJob" where id='${stored.jobId}'`,
    ),
  );
  log(
    'USAGE LEDGER:',
    sql(
      `select operation,quantity from "UsageLedger" where "referenceId"='${stored.jobId}' order by "createdAt"`,
    ),
  );
  log('BADGE AFTER SEEN:', JSON.stringify(await badge()));

  // 5. Unsupported page detection on a real tab
  await site.goto('about:blank');
  const p2 = await openPopup();
  await p2.waitForTimeout(800);
  log('ABOUT:BLANK:', await text(p2));
  await p2.close();
  await site.goto('http://acme-prospect.com/');

  // 6. Real sign-in through launchWebAuthFlow with a web session, guest conversion
  const email = `e2e-${Date.now()}@example.com`;
  const signup = await fetch('http://localhost:3000/api/v1/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Correct-Horse-9-Battery' }),
  });
  const cookie = signup.headers.get('set-cookie');
  log('SIGNUP:', signup.status);
  const value = cookie.match(/prospectai_session=([^;]+)/)[1];
  await context.addCookies([
    { name: 'prospectai_session', value, domain: 'localhost', path: '/', httpOnly: true },
  ]);
  if (0)
    await fetch('http://localhost:3000/api/v1/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `prospectai_session=${value}` },
      body: JSON.stringify({ services: ['SEO'], businessName: 'E2E Agency' }),
    }).then((r) => log('ONBOARDING:', r.status));
  const guestId = (await storage()).guestSessionId;
  if (!/Try again|Dismiss/.test(await text(popup))) log('unexpected');
  const dismiss = popup.getByRole('button', { name: 'Dismiss' });
  if (await dismiss.count()) await dismiss.click();
  await popup.waitForTimeout(800);
  log('AFTER DISMISS:', await text(popup));
  const authPagePromise = context.waitForEvent('page', { timeout: 15000 }).catch(() => null);
  await popup.getByRole('button', { name: 'Sign in' }).first().click();
  const authPage = await authPagePromise;
  log('AUTH WINDOW:', authPage && authPage.url());
  if (authPage) {
    await authPage.getByRole('button', { name: 'Authorize extension' }).click({ timeout: 20000 });
    for (let i = 0; i < 30; i++) {
      const s = await storage();
      if (s.accessToken) break;
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  const afterAuth = await storage();
  log(
    'TOKENS STORED:',
    typeof afterAuth.accessToken === 'string',
    'guest keys left:',
    'guestToken' in afterAuth,
  );
  log(
    'AUTH FLOW:',
    JSON.stringify(await sw.evaluate(() => chrome.storage.session.get('authFlow'))),
  );
  log(
    'GUEST CONVERTED:',
    sql(`select status from "GuestSession" where "guestPublicId"='${guestId}' or id='${guestId}'`),
  );
  await popup.close().catch(() => {});

  // 7. Registered: reopen, analyze, result/failure, sign-out revokes server session
  popup = await openPopup();
  await popup.waitForTimeout(2500);
  log('REGISTERED OPEN:', await text(popup));
  await popup.screenshot({ path: `${shots}/4-registered.png` });
  const analyze = popup.getByRole('button', { name: /Analyze acme-prospect\.com/ });
  if (await analyze.count()) {
    await analyze.click();
    await popup.waitForTimeout(1500);
    log('REGISTERED PROGRESS:', await text(popup));
    for (let i = 0; i < 30 && /Analysis in progress|Starting/.test(await text(popup)); i++)
      await popup.waitForTimeout(1000);
    log('REGISTERED TERMINAL:', await text(popup));
    await popup.emulateMedia({ colorScheme: 'dark' });
    await popup.screenshot({ path: `${shots}/5-registered-failure-dark.png` });
    await popup.emulateMedia({ colorScheme: 'light' });
  }
  await popup.getByRole('button', { name: 'Sign out' }).click();
  await popup.waitForTimeout(2000);
  const afterOut = await storage();
  log('AFTER SIGN-OUT KEYS:', Object.keys(afterOut).join(','));
  log(
    'SERVER EXTENSION SESSIONS:',
    sql(
      `select status, "revokedAt" is not null from "ExtensionSession" order by "createdAt" desc limit 1`,
    ),
  );
  log('CONSOLE ERRORS:', JSON.stringify(consoleErrors.slice(0, 10)));
  await context.close();
})().catch((e) => {
  console.error('E2E ERROR', e);
  process.exit(1);
});
