import type { ManifestV3Export } from '@crxjs/vite-plugin';
import packageJson from './package.json' with { type: 'json' };

/**
 * Permissions are a product decision (see docs/extension-final-global-audit.md):
 * - activeTab: read the URL of the tab the user clicked the icon on, and nothing else.
 * - storage: job recovery, session tokens and theme.
 * - identity: launchWebAuthFlow for the PKCE sign-in.
 * - alarms: a 30 s background check so the icon badge shows when a job finishes.
 * There is no "tabs", no content script, no <all_urls> and no externally_connectable.
 * host_permissions holds only the ProspectAI API origin.
 */
export function createManifest(options: {
  apiOrigin: string;
  appUrl: string;
  local: boolean;
}): ManifestV3Export {
  return {
    manifest_version: 3,
    name: options.local ? 'ProspectAI (Development)' : 'ProspectAI – Website Prospect Analyzer',
    short_name: 'ProspectAI',
    version: packageJson.version,
    description:
      'Analyze a prospect’s website in one click: scores, evidence-backed problems and the services you can pitch.',
    minimum_chrome_version: '120',
    homepage_url: options.appUrl,
    action: { default_popup: 'src/popup.html', default_title: 'ProspectAI: analyze this website' },
    background: { service_worker: 'src/service-worker.ts', type: 'module' },
    permissions: ['activeTab', 'storage', 'identity', 'alarms'],
    host_permissions: [`${options.apiOrigin}/*`],
    content_security_policy: {
      extension_pages:
        "script-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
    },
    icons: {
      '16': 'src/icons/icon-16.png',
      '32': 'src/icons/icon-32.png',
      '48': 'src/icons/icon-48.png',
      '128': 'src/icons/icon-128.png',
    },
  };
}
