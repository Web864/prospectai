import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@prospectai/analysis',
    '@prospectai/api',
    '@prospectai/auth',
    '@prospectai/config',
    '@prospectai/database',
    '@prospectai/shared',
    '@prospectai/validation',
    '@prospectai/ui',
  ],
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
