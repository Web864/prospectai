import { prospectFaqQuestions } from '../../components/marketing-views';
import { PublicPage } from '../../components/public-page';
import { FaqPage } from '../../components/reference-marketing-pages';
import { StructuredData, faqStructuredData } from '../../components/structured-data';
import { listPublishedFaqs } from '../../lib/site-content';
import { publicPageMetadata } from '../../lib/site-metadata';

export const metadata = publicPageMetadata('/faq') ?? {};
// Answers added in /admin appear within a minute without a redeploy.
export const revalidate = 60;

export default async function FaqRoute() {
  const managed = await listPublishedFaqs();
  const questions = [
    ...prospectFaqQuestions,
    ...managed.map((faq) => [faq.question, faq.answer] as const),
  ];
  return (
    <PublicPage path="/faq">
      <StructuredData data={faqStructuredData(questions)} />
      <FaqPage questions={questions} />
    </PublicPage>
  );
}
