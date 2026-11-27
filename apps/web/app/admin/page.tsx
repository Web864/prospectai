import { prisma } from '@prospectai/database';
import { FilePlus2, Newspaper } from 'lucide-react';
import Link from 'next/link';
import { AdminTop } from '../../components/admin/admin-top';
import { requireSiteAdmin } from '../../lib/site-admin';
import { pageKindLabel, pageKindPath } from '../../lib/site-content';

export const metadata = { title: 'Content' };
export const dynamic = 'force-dynamic';

const dateFormat = new Intl.DateTimeFormat('en', { dateStyle: 'medium' });

export default async function AdminHome() {
  const admin = await requireSiteAdmin();
  const [pages, faqCount] = await Promise.all([
    prisma.sitePage.findMany({
      orderBy: { updatedAt: 'desc' },
      select: { id: true, kind: true, slug: true, title: true, status: true, updatedAt: true },
    }),
    prisma.siteFaq.count({ where: { status: 'PUBLISHED' } }),
  ]);
  const posts = pages.filter((page) => page.kind === 'BLOG_POST');
  const landing = pages.filter((page) => page.kind === 'LANDING_PAGE');
  const live = pages.filter((page) => page.status === 'PUBLISHED').length;

  const table = (rows: typeof pages, empty: string) =>
    rows.length ? (
      <table className="admin-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Status</th>
            <th className="is-optional">URL</th>
            <th className="is-optional">Updated</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <Link href={`/admin/pages/${row.id}`}>{row.title}</Link>
              </td>
              <td>
                <span className={`admin-badge${row.status === 'PUBLISHED' ? ' is-live' : ''}`}>
                  {row.status === 'PUBLISHED' ? 'Published' : 'Draft'}
                </span>
              </td>
              <td className="is-optional">
                {pageKindPath[row.kind]}/{row.slug}
              </td>
              <td className="is-optional">{dateFormat.format(row.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    ) : (
      <p className="admin-empty">{empty}</p>
    );

  return (
    <>
      <AdminTop email={admin.email} active="/admin" />
      <main className="admin-main">
        <div className="admin-head">
          <div>
            <h1>Website content</h1>
            <p>Everything here is stored in your own Postgres database.</p>
          </div>
          <div className="admin-actions">
            <Link className="admin-btn is-primary" href="/admin/pages/new?kind=BLOG_POST">
              <Newspaper size={16} aria-hidden="true" /> New blog post
            </Link>
            <Link className="admin-btn" href="/admin/pages/new?kind=LANDING_PAGE">
              <FilePlus2 size={16} aria-hidden="true" /> New landing page
            </Link>
          </div>
        </div>
        <div className="admin-grid">
          <div className="admin-stat">
            <strong>{posts.length}</strong>
            <span>Blog posts</span>
          </div>
          <div className="admin-stat">
            <strong>{landing.length}</strong>
            <span>Landing pages</span>
          </div>
          <div className="admin-stat">
            <strong>{live}</strong>
            <span>Published</span>
          </div>
          <div className="admin-stat">
            <strong>{faqCount}</strong>
            <span>Published FAQ answers</span>
          </div>
        </div>
        <section className="admin-panel">
          <header>
            <h2>{pageKindLabel.BLOG_POST}s</h2>
            <Link className="admin-btn" href="/blog" target="_blank">
              View blog
            </Link>
          </header>
          {table(posts, 'No posts yet. Your first opinion piece on AI is one click away.')}
        </section>
        <section className="admin-panel">
          <header>
            <h2>{pageKindLabel.LANDING_PAGE}s</h2>
          </header>
          {table(
            landing,
            'No landing pages yet. Use them for keyword pages such as /solutions/ai-prospecting-for-agencies.',
          )}
        </section>
      </main>
    </>
  );
}
