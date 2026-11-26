/**
 * Decides, from the active tab URL alone, whether ProspectAI can analyze the page. The server
 * re-validates every URL (normalizePublicUrl, DNS and private-network checks), so this is a
 * fast, honest first answer for the UI, never the security boundary.
 */
export type UnsupportedReason =
  | 'no_access'
  | 'browser_page'
  | 'not_web'
  | 'local_network'
  | 'linkedin'
  | 'document'
  | 'invalid';

export type PageDetection =
  | { supported: true; url: string; domain: string }
  | { supported: false; reason: UnsupportedReason };

const browserSchemes = [
  'chrome:',
  'chrome-extension:',
  'chrome-untrusted:',
  'devtools:',
  'edge:',
  'about:',
  'view-source:',
  'chrome-search:',
];
const documentExtensions = /\.(pdf|docx?|xlsx?|pptx?|zip|png|jpe?g|gif|webp|svg|mp4|mp3)$/i;

function isLocalHostname(hostname: string) {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.lan') ||
    host.endsWith('.home.arpa') ||
    !host.includes('.') // single-label intranet names such as http://router/
  )
    return true;
  if (host.includes(':')) {
    // IPv6 literal: loopback, unspecified, unique-local and link-local ranges.
    return host === '::1' || host === '::' || /^f[cd]/.test(host) || /^fe[89ab]/.test(host);
  }
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4) return false;
  const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

export function detectPage(rawUrl: string | undefined): PageDetection {
  // Without activeTab (or on pages Chrome never exposes), tabs.query returns no URL.
  if (!rawUrl) return { supported: false, reason: 'no_access' };
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { supported: false, reason: 'invalid' };
  }
  if (browserSchemes.includes(url.protocol)) return { supported: false, reason: 'browser_page' };
  if (url.protocol !== 'http:' && url.protocol !== 'https:')
    return { supported: false, reason: 'not_web' };
  const hostname = url.hostname.toLowerCase();
  if (!hostname) return { supported: false, reason: 'invalid' };
  if (
    hostname === 'chromewebstore.google.com' ||
    (hostname === 'chrome.google.com' && url.pathname.startsWith('/webstore'))
  )
    return { supported: false, reason: 'browser_page' };
  if (isLocalHostname(hostname)) return { supported: false, reason: 'local_network' };
  if (hostname === 'linkedin.com' || hostname.endsWith('.linkedin.com'))
    return { supported: false, reason: 'linkedin' };
  if (documentExtensions.test(url.pathname)) return { supported: false, reason: 'document' };
  // Fragments never reach the server and only create distinct idempotency identities.
  url.hash = '';
  url.username = '';
  url.password = '';
  return { supported: true, url: url.toString(), domain: hostname.replace(/^www\./, '') };
}

export const unsupportedCopy: Record<UnsupportedReason, { title: string; detail: string }> = {
  no_access: {
    title: 'This page cannot be read',
    detail:
      'Chrome did not share this tab with ProspectAI. Open a public business website, then click the ProspectAI icon again.',
  },
  browser_page: {
    title: 'This page cannot be analyzed',
    detail:
      'Browser, settings and Chrome Web Store pages are not business websites. Open a prospect’s website to analyze it.',
  },
  not_web: {
    title: 'This page cannot be analyzed',
    detail: 'Only public http and https websites can be analyzed. Local files are not supported.',
  },
  local_network: {
    title: 'Private or local site',
    detail:
      'ProspectAI only analyzes websites that are publicly reachable on the internet. Local, intranet and development addresses are not supported.',
  },
  linkedin: {
    title: 'LinkedIn is not supported',
    detail:
      'Open the company’s own website instead. ProspectAI analyzes business websites, not social profiles.',
  },
  document: {
    title: 'This is a file, not a web page',
    detail: 'PDFs, images and documents cannot be analyzed. Open the company’s website instead.',
  },
  invalid: {
    title: 'This page cannot be analyzed',
    detail: 'The address of this tab is not a valid website URL.',
  },
};
