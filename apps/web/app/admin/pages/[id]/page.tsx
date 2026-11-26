import { prisma } from '@prospectai/database';
import { ArrowLeft, ExternalLink, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdminTop } from '../../../../components/admin/admin-top';
import { PageEditor, type PageEditorValues } from '../../../../components/admin/page-editor';
import { requireSiteAdmin } from '../../../../lib/site-admin';
import { pageKindLabel, pageKindParam, pageKindPath } from '../../../../lib/site-content';
import { deleteSitePage, saveSitePage } from '../../actions';

export const metadata = { title: 'Edit page' };
export const dynamic = 'force-dynamic';

export default async function AdminPageEditor({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requireSiteAdmin();
  const { id } = await params;
  const query = await searchParams;
  const isNew = id === 'new';
  const page = isNew ? null : await prisma.sitePage.findUnique({ where: { id } });
  if (!isNew && !page) notFound();
  const kind = page?.kind ?? pageKindParam(typeof query.kind === 'string' ? query.kind : undefined);
  const initial: PageEditorValues = {
    kind,
    title: page?.title ?? '',
    slug: page?.slug ?? '',
    excerpt: page?.excerpt ?? '',
    body: page?.body ?? '',
    tags: page?.tags.join(', ') ?? '',
    seoTitle: page?.seoTitle ?? '',
    seoDescription: page?.seoDescription ?? '',
    authorName: page?.authorName ?? '',
    status: page?.status ?? 'DRAFT',
  };
  const publicUrl = page ? `${pageKindPath[page.kind]}/${page.slug}` : null;

  return (
    <>
      <AdminTop email={admin.email} active="/admin" />
      <main className="admin-main">
        <div className="admin-head">
          <div>
            <Link href="/admin" className="admin-btn" style={{ marginBottom: 14 }}>
              <ArrowLeft size={16} aria-hidden="true" /> All content
            </Link>
            <h1>{isNew ? `New ${pageKindLabel[kind].toLowerCase()}` : page!.title}</h1>
          </div>
          {page && (
            <div className="admin-actions">
              {page.status === 'PUBLISHED' && publicUrl && (
                <Link className="admin-btn" href={publicUrl} target="_blank">
                  <ExternalLink size={16} aria-hidden="true" /> View live
                </Link>
              )}
              <form action={deleteSitePage.bind(null, page.id)}>
                <button className="admin-btn is-danger" type="submit">
                  <Trash2 size={16} aria-hidden="true" /> Delete
                </button>
              </form>
            </div>
          )}
        </div>
        <PageEditor
          key={page?.updatedAt.toISOString() ?? 'new'}
          action={saveSitePage.bind(null, page?.id ?? null)}
          initial={initial}
          basePath={pageKindPath[kind]}
          created={query.created === '1'}
        />
      </main>
    </>
  );
}
