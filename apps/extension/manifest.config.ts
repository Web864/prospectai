import type { ManifestV3Export } from '@crxjs/vite-plugin';

const manifest: ManifestV3Export = {
  manifest_version: 3,
  name: 'ProspectAI',
  version: '0.1.0',
  description: 'Analyze the current business website with ProspectAI.',
  action: { default_popup: 'src/popup.html' },
  background: { service_worker: 'src/service-worker.ts', type: 'module' },
  permissions: ['activeTab', 'storage'],
  host_permissions: ['https://app.prospectai.example/*'],
  content_security_policy: {
    extension_pages: "script-src 'self'; object-src 'self'; base-uri 'self'",
  },
  icons: {
    '16': 'src/icons/icon-16.png',
    '32': 'src/icons/icon-32.png',
    '48': 'src/icons/icon-48.png',
    '128': 'src/icons/icon-128.png',
  },
};
export default manifest;
