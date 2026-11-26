#!/usr/bin/env node
// Refuses to bless an extension build that must never reach the Chrome Web Store: development
// names, loopback or plain-HTTP origins, broad host access or permissions beyond the reviewed set.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const directory = process.argv[2] ?? 'dist-production';
const manifest = JSON.parse(readFileSync(join(directory, 'manifest.json'), 'utf8'));
const problems = [];
const allowedPermissions = new Set(['activeTab', 'storage', 'identity', 'alarms']);

if (manifest.manifest_version !== 3) problems.push('manifest_version must be 3');
if (/development/i.test(manifest.name)) problems.push(`development name "${manifest.name}"`);
for (const permission of manifest.permissions ?? [])
  if (!allowedPermissions.has(permission)) problems.push(`unreviewed permission "${permission}"`);
if (manifest.optional_permissions?.length) problems.push('unreviewed optional_permissions');
if (manifest.content_scripts?.length) problems.push('content_scripts are not part of the design');
if (manifest.externally_connectable)
  problems.push('externally_connectable is not part of the design');
const hosts = manifest.host_permissions ?? [];
if (hosts.length !== 1)
  problems.push(`expected exactly one host permission, found ${hosts.length}`);
for (const host of hosts) {
  if (!host.startsWith('https://')) problems.push(`host permission "${host}" is not HTTPS`);
  if (/\*\.|<all_urls>|localhost|127\.|\[::1\]|0\.0\.0\.0/.test(host))
    problems.push(`host permission "${host}" is broad or local`);
}
if (/localhost|127\.0\.0\.1/.test(manifest.homepage_url ?? '')) problems.push('local homepage_url');

const files = [];
const walk = (path) => {
  for (const entry of readdirSync(path)) {
    const full = join(path, entry);
    if (statSync(full).isDirectory()) walk(full);
    else if (/\.(js|html|json)$/.test(entry)) files.push(full);
  }
};
walk(directory);
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  if (/https?:\/\/(localhost|127\.0\.0\.1)[:/]/.test(text))
    problems.push(`${file} references a local origin`);
  if (/sk-[A-Za-z0-9]{20,}|sk_live_|whsec_|AIza[0-9A-Za-z_-]{30,}/.test(text))
    problems.push(`${file} contains something that looks like a secret key`);
  if (/\beval\(|new Function\(/.test(text)) problems.push(`${file} uses eval or new Function`);
}

if (problems.length) {
  console.error(`Release check failed for ${directory}:\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log(`Release check passed for ${directory} (${files.length} files, host ${hosts[0]}).`);
