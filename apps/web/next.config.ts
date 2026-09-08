import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@prospectai/api',
    '@prospectai/shared',
    '@prospectai/validation',
    '@prospectai/ui',
  ],
  poweredByHeader: false,
};
export default nextConfig;
