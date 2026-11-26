// Copies the local unpacked build to a test directory and adds a host permission for the fake
// prospect site, because Playwright cannot click the toolbar icon that grants activeTab.
// The released manifest is never modified; verify-release.mjs rejects any extra host.
const { cpSync, readFileSync, rmSync, writeFileSync } = require('node:fs');
const { join, resolve } = require('node:path');
const target = resolve(process.argv[2] ?? join(__dirname, '.ext'));
rmSync(target, { recursive: true, force: true });
cpSync(join(__dirname, '..', 'dist'), target, { recursive: true });
const manifestPath = join(target, 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
manifest.host_permissions.push('http://acme-prospect.com/*');
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log(target);
