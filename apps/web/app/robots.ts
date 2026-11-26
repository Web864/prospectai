import type { MetadataRoute } from 'next';
import { absoluteUrl } from '../lib/site-metadata';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/app', '/api/', '/onboarding', '/extension/'],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
