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
      './public/brand-mark.png',
    ],
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};
export default nextConfig;
