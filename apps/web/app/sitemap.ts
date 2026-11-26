import type { MetadataRoute } from 'next';
import { listPublishedPages, pageKindPath } from '../lib/site-content';
import { absoluteUrl, publicPages } from '../lib/site-metadata';

// Rebuilt at most once a minute so newly published posts are discoverable without a deploy.
export const revalidate = 60;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, landing] = await Promise.all([
    listPublishedPages('BLOG_POST', 1000),
    listPublishedPages('LANDING_PAGE', 1000),
  ]);
  return [
    ...publicPages.map((page) => ({
      url: absoluteUrl(page.path),
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    })),
    ...posts.map((post) => ({
      url: absoluteUrl(`${pageKindPath.BLOG_POST}/${post.slug}`),
      lastModified: post.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    ...landing.map((page) => ({
      url: absoluteUrl(`${pageKindPath.LANDING_PAGE}/${page.slug}`),
      lastModified: page.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ];
}
