// Usage: xvfb-run -a node e2e/popup-size.e2e.cjs <unpacked-extension-dir> [screenshot.png]
// Opens the REAL toolbar popup (chrome.action.openPopup) in headed Chromium and measures the
// auto-sized popup window. Headless Chromium and windows.create() do not auto-size, so only this
// path reproduces the collapsed-popup bug (docs/extension-rendering-root-cause.md).
const { chromium } = require('playwright');
const { writeFileSync } = require('node:fs');
const PORT = 9333;
async function cdp(wsUrl, method, params = {}) {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve) => (ws.onopen = resolve));
  ws.send(JSON.stringify({ id: 1, method, params }));
  const reply = await new Promise((resolve) => (ws.onmessage = (m) => resolve(JSON.parse(m.data))));
  ws.close();
  return reply.result;
}
(async () => {
  const [ext, shot] = process.argv.slice(2);
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    viewport: null,
    args: [
      `--disable-extensions-except=${ext}`,
      `--load-extension=${ext}`,
      `--remote-debugging-port=${PORT}`,
    ],
  });
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');
  const page = await context.newPage();
  await page.goto('about:blank');
  await sw.evaluate(() => chrome.action.openPopup());
  await new Promise((resolve) => setTimeout(resolve, 2500));
  const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const popup = targets.find((t) => t.url.includes('/src/popup.html'));
  if (!popup) throw new Error('popup did not open');
  const { result } = await cdp(popup.webSocketDebuggerUrl, 'Runtime.evaluate', {
    expression:
      'JSON.stringify({ window: innerWidth, height: innerHeight, body: document.body.getBoundingClientRect().width, horizontalScroll: document.documentElement.scrollWidth > innerWidth })',
    returnByValue: true,
  });
  const size = JSON.parse(result.value);
  console.log('popup size:', size);
  if (shot) {
    const { data } = await cdp(popup.webSocketDebuggerUrl, 'Page.captureScreenshot');
    writeFileSync(shot, Buffer.from(data, 'base64'));
  }
  await context.close();
  if (size.window < 600 || size.body < 600 || size.horizontalScroll) {
    console.error('FAIL: the popup collapsed or scrolls sideways');
    process.exit(1);
  }
  console.log('PASS');
})();
