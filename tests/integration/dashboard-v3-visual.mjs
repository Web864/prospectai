// Isolated rendering QA only. Fixtures never enter application code or the database.
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const base = process.argv[2] ?? 'http://localhost:3001';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Local QA only');
const output = resolve('test-results/dashboard-v3');
await mkdir(output, { recursive: true });
const profile = await mkdtemp(resolve(output, 'chrome-'));
const referenceFonts = await Promise.all(
  [
    ['DM Sans', 'dm-sans-latin.woff2', '400 700'],
    ['Manrope', 'manrope-latin.woff2', '400 800'],
  ].map(async ([family, file, weight]) => ({
    family,
    weight,
    data: (await readFile(resolve('apps/web/public/assets/prospectai/fonts', file))).toString(
      'base64',
    ),
  })),
);
const chrome = spawn(
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    'about:blank',
  ],
  { windowsHide: true, stdio: 'ignore' },
);
const delay = (ms) => new Promise((resolveDelay) => setTimeout(resolveDelay, ms));

class CDP {
  constructor(socket) {
    this.socket = socket;
    this.next = 0;
    this.pending = new Map();
    this.events = new Map();
    socket.addEventListener('message', ({ data }) => {
      const value = JSON.parse(String(data));
      if (value.id) {
        const pending = this.pending.get(value.id);
        if (!pending) return;
        this.pending.delete(value.id);
        clearTimeout(pending.timer);
        if (value.error) pending.reject(new Error(value.error.message));
        else pending.resolve(value.result);
      } else this.events.get(value.method)?.(value.params);
    });
  }
  send(method, params = {}) {
    return new Promise((resolveCall, reject) => {
      const id = ++this.next;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP timeout: ${method}`));
      }, 30000);
      this.pending.set(id, { resolve: resolveCall, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails)
      throw new Error(
        result.exceptionDetails.exception?.description ?? result.exceptionDetails.text,
      );
    return result.result.value;
  }
}

const fixtures = {
  '/me': {
    data: {
      userId: 'visual-only',
      email: 'visual@example.test',
      displayName: 'Visual QA',
      organizationName: 'Visual QA',
      role: 'owner',
      expiresAt: '2030-01-01T00:00:00.000Z',
    },
  },
  '/dashboard': {
    data: {
      analyses: 0,
      leads: 0,
      qualifiedOpportunities: 0,
      contactedProspects: 0,
      replies: 0,
      meetings: 0,
      wonClients: 0,
      analysesUsed: 0,
      analysesLimit: 3,
      plan: 'free',
      extensionConnected: false,
      recentActivity: [],
    },
  },
  '/analyses': { data: [] },
  '/opportunities': { data: [] },
  '/pitches': { data: [] },
  '/leads': { data: [], meta: { page: 1, totalPages: 0 } },
  '/usage': {
    data: {
      plan: 'free',
      used: 0,
      limit: 3,
      remaining: 3,
      periodStart: '2026-10-01T00:00:00.000Z',
      periodEnd: '2026-11-01T00:00:00.000Z',
      quotaReached: false,
    },
  },
  '/billing': {
    data: { plan: 'free', status: 'active', currentPeriodEnd: null, cancelAtPeriodEnd: false },
  },
  '/settings': {
    data: {
      displayName: '',
      role: null,
      services: [],
      outreachPreferences: null,
      extension: { connected: false, status: 'disconnected' },
    },
  },
};
const routes = [
  ['Dashboard', '/app'],
  ['Research', '/app/research'],
  ['Analyses', '/app/analyses'],
  ['Opportunities', '/app/opportunities'],
  ['Leads', '/app/leads'],
  ['Pitches', '/app/pitches'],
  ['Usage', '/app/usage'],
  ['Billing', '/app/billing'],
  ['Settings', '/app/settings'],
  ['Extension', '/app/settings/extension'],
];
let client;
const results = [];
const errors = [];
try {
  let port;
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      port = Number(
        (await readFile(resolve(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0],
      );
      break;
    } catch {
      await delay(200);
    }
  }
  if (!port) throw new Error('Headless Chrome did not expose a local debugging endpoint');
  const target = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, {
    method: 'PUT',
  }).then((r) => r.json());
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((accept, reject) => {
    socket.addEventListener('open', accept);
    socket.addEventListener('error', reject);
  });
  client = new CDP(socket);
  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('Network.enable');
  await client.send('Network.setBlockedURLs', {
    urls: ['*://fonts.googleapis.com/*', '*://fonts.gstatic.com/*'],
  });
  client.events.set('Runtime.exceptionThrown', (event) =>
    errors.push(event.exceptionDetails.exception?.description ?? event.exceptionDetails.text),
  );
  client.events.set('Fetch.requestPaused', async ({ requestId, request }) => {
    try {
      const pathname = new URL(request.url).pathname.replace('/api/v1', '');
      if (request.method !== 'GET') throw new Error('Visual QA must not submit mutations');
      await client.send('Fetch.fulfillRequest', {
        requestId,
        responseCode: fixtures[pathname] ? 200 : 404,
        responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
        body: Buffer.from(
          JSON.stringify(
            fixtures[pathname] ?? { error: { message: 'Visual fixture unavailable' } },
          ),
        ).toString('base64'),
      });
    } catch (error) {
      errors.push(error.message);
      await client.send('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' });
    }
  });
  await client.send('Fetch.enable', { patterns: [{ urlPattern: `${base}/api/v1/*` }] });
  async function ready(expression) {
    for (let attempt = 0; attempt < 160; attempt++) {
      if (await client.evaluate(expression)) return;
      await delay(250);
    }
    throw new Error(`Page not ready: ${expression}`);
  }
  const prototype = pathToFileURL(
    resolve('docs/ProspectAI_Codex_Handoff/references/prototypes/dashboard-v3.html'),
  ).href;
  for (const width of [1440, 1024, 768, 390]) {
    await client.send('Emulation.setDeviceMetricsOverride', {
      width,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    });
    for (const theme of ['light', 'dark']) {
      for (const [name, path] of routes) {
        for (const mode of ['prototype', 'application']) {
          await client.send('Page.navigate', {
            url: mode === 'prototype' ? prototype : `${base}${path}`,
          });
          await ready(
            mode === 'prototype'
              ? 'typeof go === "function"'
              : `!!document.querySelector('.v3-content') && !document.querySelector('[aria-label="Loading workspace data"]')`,
          );
          if (mode === 'prototype') {
            await client.evaluate(
              `go(${JSON.stringify(name)}); document.body.classList.toggle('dark', ${theme === 'dark'});`,
            );
            // Use the same original font families without relying on external font delivery.
            await client.evaluate(
              `(async()=>{for(const {family,data,weight} of ${JSON.stringify(referenceFonts)}){const font=new FontFace(family,'url(data:font/woff2;base64,'+data+')',{weight});document.fonts.add(await font.load());}})()`,
            );
          } else if (
            await client.evaluate(
              `document.documentElement.dataset.theme !== ${JSON.stringify(theme)}`,
            )
          ) {
            await ready(`!!document.querySelector('button[aria-label="Use ${theme} theme"]')`);
            await client.evaluate(
              `document.querySelector('button[aria-label="Use ${theme} theme"]').click()`,
            );
            await ready(`document.documentElement.dataset.theme === ${JSON.stringify(theme)}`);
          }
          await client.evaluate('document.fonts.ready.then(()=>true)');
          await delay(150);
          const metrics = await client.evaluate(
            `(()=>{const app=${mode === 'application'};const root=app?document.querySelector('.v3-content'):document.querySelector('.content');const side=document.querySelector(app?'.v3-side':'.side');const top=document.querySelector(app?'.v3-top':'.top');const cards=[...document.querySelectorAll(app?'.v3-stat':'.stat')];return {url:location.pathname,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,overflow:document.documentElement.scrollWidth>innerWidth,heading:root?.querySelector('h1')?.textContent,canvas:getComputedStyle(document.querySelector(app?'.v3-app':'body')).backgroundColor,sidebarWidth:side?.getBoundingClientRect().width,toolbarHeight:top?.getBoundingClientRect().height,cardWidths:cards.map(c=>Math.round(c.getBoundingClientRect().width)),apiError:!![...document.querySelectorAll('h2')].find(h=>/Unable to load|Sign in required/.test(h.textContent))};})()`,
          );
          const filename = `${name.toLowerCase()}-${width}-${theme}-${mode}.png`;
          const capture = await client.send('Page.captureScreenshot', {
            format: 'png',
            captureBeyondViewport: true,
          });
          await writeFile(resolve(output, filename), Buffer.from(capture.data, 'base64'));
          results.push({ name, width, theme, mode, filename, ...metrics });
          if (mode === 'application') {
            const invisibleActions = await client.evaluate(
              `Array.from(document.querySelectorAll('.v3-btn')).filter((button)=>{const style=getComputedStyle(button);return style.color===style.backgroundColor;}).map((button)=>button.textContent.trim())`,
            );
            if (invisibleActions.length)
              errors.push(
                `${filename}: insufficient action contrast: ${invisibleActions.join(', ')}`,
              );
          }
          if (metrics.overflow || metrics.apiError)
            errors.push(
              `${filename}: ${metrics.overflow ? 'horizontal overflow' : 'invalid fixture response'}`,
            );
        }
      }
      console.log(`Rendered ${width}px ${theme}: 10 prototype/application pairs`);
    }
  }
} catch (error) {
  errors.push(error.message);
} finally {
  if (client) {
    await client.send('Browser.close').catch(() => {});
    client.socket.close();
  }
  chrome.kill();
  await writeFile(
    resolve(output, 'results.json'),
    JSON.stringify({ fixtureOnly: true, results, errors }, null, 2),
  );
}
console.log(JSON.stringify({ screenshots: results.length, errors }));
if (errors.length) process.exitCode = 1;
