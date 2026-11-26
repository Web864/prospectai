// Usage: node e2e/result-visual.e2e.cjs <prepared-extension-dir> <screenshot-dir>
// Visual check of the ready, progress and result screens in real Chromium with mocked API responses (route interception).
const { chromium } = require('playwright');
const shots = process.argv[3];
const analysisId = 'cjld2cjxh0000qzrmn831i7rn';
const result = (status) => ({
  data: {
    id: analysisId,
    status,
    domain: 'acme-prospect.com',
    companyName: 'acme-prospect.com',
    analyzedAt: new Date().toISOString(),
    websiteScore: 48,
    opportunityScore: 81,
    confidence: 0.78,
    businessSummary:
      'Acme Plumbing is a family-run plumbing and heating company serving Springfield homeowners with emergency repairs, boiler installation and annual maintenance plans.',
    aiStatus: status === 'partial' ? 'unavailable_not_configured' : 'completed',
    limitations:
      status === 'partial'
        ? [
            'AI analysis was not configured for this run.',
            'This partial report contains the evidence and deterministic scoring that completed successfully.',
          ]
        : [],
    coverage: { discovered: 6, analyzed: 4, skipped: 2, limitations: [] },
    findings: [
      {
        id: 'f1',
        category: 'seo',
        title: 'Missing meta description on 3 pages',
        evidence: 'No <meta name="description"> on /, /services, /contact',
        interpretation: null,
        severity: 'MEDIUM',
      },
      {
        id: 'f2',
        category: 'conversion',
        title: 'No online booking or contact form',
        evidence: 'No form element found on 4 analyzed pages; only a phone number.',
        interpretation: null,
        severity: 'HIGH',
      },
      {
        id: 'f3',
        category: 'performance',
        title: 'Homepage responds slowly (2.9 s)',
        evidence: 'Server response time 2,940 ms',
        interpretation: null,
        severity: 'MEDIUM',
      },
      {
        id: 'f4',
        category: 'trust',
        title: 'No customer reviews shown',
        evidence: 'No review markup found',
        interpretation: null,
        severity: 'LOW',
      },
    ],
    opportunities: [
      {
        id: 'cjld2cjxh0001qzrmn831i7rn',
        title: 'x',
        serviceCategory: 'Conversion optimization',
        summary: 's',
        opportunityScore: 84,
        confidence: 0.8,
        commercialReason:
          'Visitors can only call; adding online booking captures out-of-hours emergency leads.',
        pitchAngle: 'Open with the missed out-of-hours leads and offer a booking-form sprint.',
      },
      {
        id: 'cjld2cjxh0002qzrmn831i7rn',
        title: 'x',
        serviceCategory: 'Technical SEO',
        summary: 's',
        opportunityScore: 66,
        confidence: 0.7,
        commercialReason: 'Missing descriptions weaken click-through from local search.',
        pitchAngle: null,
      },
    ],
    pitches: [],
  },
});
(async () => {
  const ext = process.argv[2];
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    headless: true,
    args: [
      `--disable-extensions-except=${ext}`,
      `--load-extension=${ext}`,
      '--host-resolver-rules=MAP acme-prospect.com 127.0.0.1:8099',
    ],
  });
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');
  const site = await context.newPage();
  await site.goto('http://acme-prospect.com/');
  for (const status of ['ready', 'extracting', 'completed', 'partial']) {
    await sw.evaluate(() => chrome.storage.local.remove('activeAnalysis'));
    await sw.evaluate(
      ({ analysisId, status }) =>
        chrome.storage.local.set({
          accessToken: 'a'.repeat(43),
          refreshToken: 'r'.repeat(43),
          accessTokenExpiresAt: '2030-01-01T00:00:00.000Z',
          sessionState: 'connected',
          ...(status === 'ready'
            ? {}
            : {
                activeAnalysis: {
                  jobId: 'job-1',
                  analysisId,
                  mode: 'registered',
                  url: 'http://acme-prospect.com/',
                  domain: 'acme-prospect.com',
                  submittedAt: new Date().toISOString(),
                },
              }),
        }),
      { analysisId, status },
    );
    await context.route('http://localhost:3000/api/v1/**', (route) => {
      const url = route.request().url();
      if (url.includes('/analysis-jobs/'))
        return route.fulfill({
          json: {
            data: {
              id: 'job-1',
              analysisId,
              status,
              progress: status === 'extracting' ? 40 : 100,
              attempt: 1,
              maxAttempts: 3,
              nextAttemptAt: new Date().toISOString(),
              startedAt: new Date().toISOString(),
              finishedAt: null,
              errorCode: null,
              errorMessage: null,
              updatedAt: new Date().toISOString(),
            },
          },
        });
      if (url.endsWith('/analyses/' + analysisId)) return route.fulfill({ json: result(status) });
      if (url.endsWith('/usage'))
        return route.fulfill({
          json: {
            data: {
              plan: 'pro',
              used: 12,
              limit: 100,
              remaining: 88,
              periodStart: '2026-11-01T00:00:00.000Z',
              periodEnd: '2026-12-01T00:00:00.000Z',
              quotaReached: false,
            },
          },
        });
      if (url.endsWith('/pitches'))
        return route.fulfill({
          status: 201,
          json: {
            data: {
              id: 'p',
              format: 'cold_email',
              content:
                'Subject: Out-of-hours leads at Acme\n\nHi team, I noticed your site only offers a phone number...',
              message: 'Pitch generated.',
            },
          },
        });
      if (url.endsWith('/leads'))
        return route.fulfill({
          status: 201,
          json: { data: { id: 'lead-1', message: 'Lead saved.' } },
        });
      return route.fulfill({ status: 404, json: { error: { code: 'NOT_FOUND' } } });
    });
    const pending = context.waitForEvent('page');
    await sw.evaluate(() =>
      chrome.windows.create({
        url: chrome.runtime.getURL('src/popup.html'),
        type: 'popup',
        focused: false,
      }),
    );
    const p = await pending;
    await p.setViewportSize({ width: 640, height: 600 });
    await p.waitForTimeout(2000);
    // Hover a card so the pointer spotlight and card glow show in the screenshot.
    const card = p.locator('.glow-card').first();
    const box = await card.boundingBox();
    if (box) await p.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.5, { steps: 4 });
    await p.waitForTimeout(400);
    if (status === 'completed') {
      await p.getByRole('button', { name: 'Save prospect' }).click();
      await p.getByRole('button', { name: 'Generate pitch' }).click();
      await p.waitForTimeout(800);
    }
    await p.screenshot({ path: `${shots}/6-result-${status}-light.png`, fullPage: true });
    await p.emulateMedia({ colorScheme: 'dark' });
    await p.waitForTimeout(200);
    await p.screenshot({ path: `${shots}/6-result-${status}-dark.png`, fullPage: true });
    // 200% browser zoom on the popup
    await p.emulateMedia({ colorScheme: 'light' });
    // At 200% zoom Chrome's 800 px popup cap leaves a 400 CSS px viewport.
    await p.setViewportSize({ width: 400, height: 600 });
    await p.waitForTimeout(200);
    if (status === 'completed')
      await p.screenshot({ path: `${shots}/7-result-zoom-200.png`, fullPage: true });
    const overflow = await p.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    console.log(
      status,
      'horizontal overflow at 200% zoom:',
      overflow,
      '| text:',
      (await p.locator('main').innerText()).replace(/\s+/g, ' ').slice(0, 200),
    );
    await p.close();
    await context.unroute('http://localhost:3000/api/v1/**');
  }
  await context.close();
})();
