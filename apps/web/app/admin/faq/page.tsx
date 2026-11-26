import { prisma } from '@prospectai/database';
import { AdminTop } from '../../../components/admin/admin-top';
import { FaqEditor } from '../../../components/admin/faq-editor';
import { requireSiteAdmin } from '../../../lib/site-admin';
import { deleteSiteFaq, saveSiteFaq } from '../actions';

export const metadata = { title: 'FAQ and chatbot answers' };
export const dynamic = 'force-dynamic';

export default async function AdminFaq() {
  const admin = await requireSiteAdmin();
  const faqs = await prisma.siteFaq.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  return (
    <>
      <AdminTop email={admin.email} active="/admin/faq" />
      <main className="admin-main">
        <div className="admin-head">
          <div>
            <h1>FAQ and chatbot answers</h1>
            <p>
              Published answers appear on /faq with FAQ schema, and they are what the website
              assistant is allowed to answer from, together with published pages and posts.
            </p>
          </div>
        </div>
        <div className="admin-faq-list">
          <FaqEditor
            key={`new-${faqs.length}`}
            action={saveSiteFaq.bind(null, null)}
            initial={{
              question: '',
              answer: '',
              sortOrder: (faqs.length + 1) * 10,
              status: 'PUBLISHED',
            }}
          />
          {faqs.map((faq) => (
            <FaqEditor
              key={`${faq.id}-${faq.updatedAt.toISOString()}`}
              action={saveSiteFaq.bind(null, faq.id)}
              remove={deleteSiteFaq.bind(null, faq.id)}
              initial={faq}
            />
          ))}
        </div>
      </main>
    </>
  );
}
