import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const command = process.argv[2];
const supportedCommands = new Set(['build', 'dev', 'start']);

if (!command || !supportedCommands.has(command)) {
  console.error('Usage: node scripts/run-next.mjs <build|dev|start> [...args]');
  process.exit(1);
}

const rootEnvFile = fileURLToPath(new URL('../../../.env', import.meta.url));
if (existsSync(rootEnvFile)) process.loadEnvFile(rootEnvFile);

// Next relies on these two canonical values when selecting server and client
// bundles. A repository-level .env must not override the command's runtime mode.
process.env.NODE_ENV = command === 'dev' ? 'development' : 'production';

const nextBin = fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url));
const nodeArguments = [];

// Node 25 exposes server-side Web Storage without a backing file. Next's dev
// overlay mistakes that partial global for browser localStorage during SSR.
if (process.allowedNodeEnvironmentFlags.has('--no-experimental-webstorage')) {
  nodeArguments.push('--no-experimental-webstorage');
}

const result = spawnSync(
  process.execPath,
  [...nodeArguments, nextBin, command, ...process.argv.slice(3)],
  { stdio: 'inherit' },
);

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
