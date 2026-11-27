'use server';

import { prisma, Prisma } from '@prospectai/database';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { writeAudit } from '../../lib/audit';
import { requireSiteAdmin } from '../../lib/site-admin';
import {
  pageKindPath,
  siteFaqInputSchema,
  sitePageInputSchema,
  slugify,
} from '../../lib/site-content';

export interface ActionState {
  error?: string;
  fieldErrors?: Record<string, string>;
  saved?: boolean;
}

const fieldErrors = (issues: { path: (string | number)[]; message: string }[]) =>
  Object.fromEntries(issues.map((issue) => [String(issue.path[0] ?? 'form'), issue.message]));

function revalidatePublic(kind: 'BLOG_POST' | 'LANDING_PAGE', slug?: string) {
  const base = pageKindPath[kind];
  revalidatePath(base);
  if (slug) revalidatePath(`${base}/${slug}`);
  revalidatePath('/sitemap.xml');
}

/**
 * Creates or updates a blog post or landing page. Server actions are POST-only and Next.js
 * rejects cross-origin calls, so together with requireSiteAdmin this is CSRF-safe.
 */
export async function saveSitePage(
  id: string | null,
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const admin = await requireSiteAdmin();
  const parsed = sitePageInputSchema.safeParse({
    kind: form.get('kind'),
    title: form.get('title') ?? '',
    slug: form.get('slug') || form.get('title') || '',
    excerpt: form.get('excerpt') ?? '',
    body: form.get('body') ?? '',
    tags: form.get('tags') ?? '',
    seoTitle: form.get('seoTitle') ?? '',
    seoDescription: form.get('seoDescription') ?? '',
    authorName: form.get('authorName') ?? '',
    status: form.get('status'),
  });
  if (!parsed.success)
    return { error: 'Fix the highlighted fields.', fieldErrors: fieldErrors(parsed.error.issues) };
  const input = { ...parsed.data, slug: parsed.data.slug || slugify(parsed.data.title) };
  if (!input.slug) return { fieldErrors: { slug: 'Use letters or numbers in the URL slug.' } };

  let saved;
  try {
    const existing = id ? await prisma.sitePage.findUnique({ where: { id } }) : null;
    if (id && !existing) return { error: 'This page no longer exists.' };
    const publishedAt =
      input.status === 'PUBLISHED' ? (existing?.publishedAt ?? new Date()) : existing?.publishedAt;
    saved = existing
      ? await prisma.sitePage.update({
          where: { id: existing.id },
          data: { ...input, publishedAt: publishedAt ?? null },
        })
      : await prisma.sitePage.create({ data: { ...input, publishedAt: publishedAt ?? null } });
    if (existing && existing.slug !== saved.slug) revalidatePublic(existing.kind, existing.slug);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
      return { fieldErrors: { slug: 'Another page of this type already uses this URL slug.' } };
    throw error;
  }
  await writeAudit({
    action: id ? 'site_page.updated' : 'site_page.created',
    resourceType: 'SitePage',
    resourceId: saved.id,
    actorUserId: admin.userId,
    metadata: { kind: saved.kind, slug: saved.slug, status: saved.status },
  });
  revalidatePublic(saved.kind, saved.slug);
  if (!id) redirect(`/admin/pages/${saved.id}?created=1`);
  return { saved: true };
}

export async function deleteSitePage(id: string) {
  const admin = await requireSiteAdmin();
  const page = await prisma.sitePage.delete({ where: { id } }).catch(() => null);
  if (page) {
    await writeAudit({
      action: 'site_page.deleted',
      resourceType: 'SitePage',
      resourceId: id,
      actorUserId: admin.userId,
      metadata: { kind: page.kind, slug: page.slug },
    });
    revalidatePublic(page.kind, page.slug);
  }
  redirect('/admin');
}

export async function saveSiteFaq(
  id: string | null,
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const admin = await requireSiteAdmin();
  const parsed = siteFaqInputSchema.safeParse({
    question: form.get('question') ?? '',
    answer: form.get('answer') ?? '',
    sortOrder: form.get('sortOrder') || 0,
    status: form.get('status'),
  });
  if (!parsed.success)
    return { error: 'Fix the highlighted fields.', fieldErrors: fieldErrors(parsed.error.issues) };
  const faq = id
    ? await prisma.siteFaq.update({ where: { id }, data: parsed.data })
    : await prisma.siteFaq.create({ data: parsed.data });
  await writeAudit({
    action: id ? 'site_faq.updated' : 'site_faq.created',
    resourceType: 'SiteFaq',
    resourceId: faq.id,
    actorUserId: admin.userId,
    metadata: { status: faq.status },
  });
  revalidatePath('/faq');
  revalidatePath('/admin/faq');
  return { saved: true };
}

export async function deleteSiteFaq(id: string) {
  const admin = await requireSiteAdmin();
  const faq = await prisma.siteFaq.delete({ where: { id } }).catch(() => null);
  if (faq)
    await writeAudit({
      action: 'site_faq.deleted',
      resourceType: 'SiteFaq',
      resourceId: id,
      actorUserId: admin.userId,
    });
  revalidatePath('/faq');
  revalidatePath('/admin/faq');
}
