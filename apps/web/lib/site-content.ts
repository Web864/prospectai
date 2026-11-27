import { prisma } from '@prospectai/database';
import { z } from 'zod';

/**
 * Read side of the site CMS. Public pages call these with try/catch semantics built in: if the
 * database is unreachable (for example during a build without DATABASE_URL), they return empty
 * results so the static marketing site still renders.
 */

export type PageKind = 'BLOG_POST' | 'LANDING_PAGE';

export const pageKindPath: Record<PageKind, string> = {
  BLOG_POST: '/blog',
  LANDING_PAGE: '/solutions',
};

export const pageKindLabel: Record<PageKind, string> = {
  BLOG_POST: 'Blog post',
  LANDING_PAGE: 'Landing page',
};

export const pageKindParam = (value: string | undefined): PageKind =>
  value === 'LANDING_PAGE' ? 'LANDING_PAGE' : 'BLOG_POST';

async function safely<T>(query: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await query();
  } catch (error) {
    console.warn(
      JSON.stringify({
        level: 'warn',
        event: 'site_content_unavailable',
        message: error instanceof Error ? error.message.slice(0, 200) : 'unknown',
      }),
    );
    return fallback;
  }
}

const publishedWhere = (kind: PageKind) => ({
  kind,
  status: 'PUBLISHED' as const,
  publishedAt: { lte: new Date() },
});

export const listPublishedPages = (kind: PageKind, take = 50) =>
  safely(
    () =>
      prisma.sitePage.findMany({
        where: publishedWhere(kind),
        orderBy: { publishedAt: 'desc' },
        take,
        select: {
          slug: true,
          title: true,
          excerpt: true,
          tags: true,
          body: true,
          authorName: true,
          publishedAt: true,
          updatedAt: true,
        },
      }),
    [],
  );

export const findPublishedPage = (kind: PageKind, slug: string) =>
  safely(() => prisma.sitePage.findFirst({ where: { ...publishedWhere(kind), slug } }), null);

export const listPublishedFaqs = () =>
  safely(
    () =>
      prisma.siteFaq.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        select: { id: true, question: true, answer: true },
      }),
    [],
  );

// ---------- Write-side validation (used by the admin server actions) ----------

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null);

export const sitePageInputSchema = z.object({
  kind: z.enum(['BLOG_POST', 'LANDING_PAGE']),
  title: z.string().trim().min(3, 'Add a title of at least 3 characters.').max(160),
  slug: z
    .string()
    .trim()
    .max(90)
    .transform((value) => slugify(value)),
  excerpt: z.string().trim().min(10, 'Add a short summary (at least 10 characters).').max(320),
  body: z.string().trim().min(20, 'The body needs at least 20 characters.').max(100_000),
  tags: z
    .string()
    .max(400)
    .transform((value) =>
      [
        ...new Set(
          value
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean),
        ),
      ].slice(0, 10),
    ),
  seoTitle: optionalText(70),
  seoDescription: optionalText(170),
  authorName: optionalText(80),
  status: z.enum(['DRAFT', 'PUBLISHED']),
});

export type SitePageInput = z.infer<typeof sitePageInputSchema>;

export const siteFaqInputSchema = z.object({
  question: z.string().trim().min(5, 'Write the question in full.').max(240),
  answer: z.string().trim().min(10, 'Write an answer of at least 10 characters.').max(4_000),
  sortOrder: z.coerce.number().int().min(0).max(10_000).default(0),
  status: z.enum(['DRAFT', 'PUBLISHED']),
});
