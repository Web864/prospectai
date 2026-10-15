// Local Chrome diagnostics. Expressions must return only non-sensitive evidence.
import { mkdir, writeFile } from 'node:fs/promises';
const [operation, ...args] = process.argv.slice(2);
const targets = await fetch('http://127.0.0.1:9222/json/list').then((r) => r.json());
if (operation === 'targets') {
  console.log(JSON.stringify(targets.map(({ id, type, url }) => ({ id, type, url }))));
  process.exit(0);
}
const version = await fetch('http://127.0.0.1:9222/json/version').then((r) => r.json());
const target = targets.find((entry) => entry.id === args[0]);
const socket = new WebSocket(
  ['load', 'action', 'browser'].includes(operation)
    ? version.webSocketDebuggerUrl
    : target.webSocketDebuggerUrl,
);
await new Promise((resolve, reject) => {
  socket.onopen = resolve;
  socket.onerror = reject;
});
const timer = setTimeout(() => {
  console.error('Chrome operation timed out');
  socket.close();
  process.exit(1);
}, 45000);
const observations = [];
socket.onmessage = async ({ data }) => {
  const message = JSON.parse(data);
  if (message.method === 'Network.responseReceived') {
    const response = message.params.response;
    const url = new URL(response.url);
    if (url.pathname.startsWith('/api/'))
      observations.push({ endpoint: url.pathname, status: response.status });
  }
  if (message.method === 'Runtime.exceptionThrown')
    observations.push({ runtimeError: message.params.exceptionDetails.text });
  if (message.id !== 1) return;
  clearTimeout(timer);
  if (operation === 'screenshot' && message.result?.data) {
    await mkdir('test-results', { recursive: true });
    await writeFile('test-results/pdf-preview.png', Buffer.from(message.result.data, 'base64'));
    console.log('Saved test-results/pdf-preview.png');
    socket.close();
    return;
  }
  console.log(JSON.stringify({ ...message, observations }));
  socket.close();
};
if (operation === 'eval') {
  socket.send(JSON.stringify({ id: 100, method: 'Network.enable' }));
  socket.send(JSON.stringify({ id: 101, method: 'Runtime.enable' }));
}
socket.send(
  JSON.stringify(
    operation === 'load'
      ? { id: 1, method: 'Extensions.loadUnpacked', params: { path: args[0] } }
      : operation === 'browser'
        ? { id: 1, method: args[0], params: JSON.parse(args[1] ?? '{}') }
        : operation === 'action'
          ? {
              id: 1,
              method: 'Extensions.triggerAction',
              params: { id: args[0], targetId: args[1] },
            }
          : operation === 'screenshot'
            ? { id: 1, method: 'Page.captureScreenshot', params: { format: 'png' } }
            : {
                id: 1,
                method: 'Runtime.evaluate',
                params: {
                  expression: args.slice(1).join(' '),
                  awaitPromise: true,
                  returnByValue: true,
                  userGesture: true,
                },
              },
  ),
);
