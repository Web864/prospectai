import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  distDir: process.env.NODE_ENV === 'development' ? '.next-development' : '.next',
  transpilePackages: [
    '@prospectai/analysis',
    '@prospectai/api',
    '@prospectai/auth',
    '@prospectai/config',
    '@prospectai/database',
    '@prospectai/scoring',
    '@prospectai/shared',
    '@prospectai/validation',
    '@prospectai/ui',
  ],
  // Trace files from the monorepo root so workspace packages are bundled into serverless functions.
  outputFileTracingRoot: fileURLToPath(new URL('../../', import.meta.url)),
  // The PDF route reads its font and logo from disk; serverless bundles only include traced files.
  outputFileTracingIncludes: {
    '/api/v1/analyses/[analysisId]/pdf': [
      './public/assets/prospectai/fonts/NotoSans-Regular.ttf',
      './public/assets/prospectai/fonts/NotoSans-Bold.ttf',
      './public/brand-mark.png',
    ],
  },
  poweredByHeader: false,
  // Old workspace aliases rendered the same view as another URL. Send them to the one canonical path.
  async redirects() {
    return [
      ['/app/dashboard', '/app'],
      ['/app/overview', '/app'],
      ['/app/prospects', '/app/leads'],
      ['/app/profile', '/app/settings'],
      ['/app/integrations', '/app/settings/extension'],
    ].map(([source, destination]) => ({
      source: source!,
      destination: destination!,
      permanent: true,
    }));
  },
  async headers() {
    const development = process.env.NODE_ENV === 'development';
    // HSTS and request upgrading only make sense when the app is served over HTTPS.
    const https = (process.env.NEXT_PUBLIC_APP_URL ?? '').startsWith('https://');
    // Next.js injects inline bootstrap scripts, so script-src needs 'unsafe-inline' unless
    // per-request nonces are adopted (which would force every page to render dynamically).
    // The policy still blocks third-party script origins, plugins, framing and base hijacking.
    const contentSecurityPolicy = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${development ? " 'unsafe-eval'" : ''}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      `connect-src 'self'${development ? ' ws: wss:' : ''}`,
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      ...(https ? ['upgrade-insecure-requests'] : []),
    ].join('; ');
    const noIndex = { key: 'X-Robots-Tag', value: 'noindex, nofollow' };
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
          ...(https
            ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }]
            : []),
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      // Private, transactional and API surfaces must never be indexed.
      { source: '/app/:path*', headers: [noIndex] },
      { source: '/app', headers: [noIndex] },
      { source: '/api/:path*', headers: [noIndex] },
      { source: '/onboarding', headers: [noIndex] },
      { source: '/admin', headers: [noIndex] },
      { source: '/admin/:path*', headers: [noIndex] },
      { source: '/extension/:path*', headers: [noIndex] },
      {
        source: '/:page(login|signup|verify-email|forgot-password|reset-password)',
        headers: [noIndex],
      },
    ];
  },
};
export default nextConfig;
