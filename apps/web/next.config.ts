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
};
export default nextConfig;
