import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ContentArticle, articleMetadata } from '../../../components/content-article';
import { SiteShell } from '../../../components/site-shell';
import { findPublishedPage } from '../../../lib/site-content';

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await findPublishedPage('LANDING_PAGE', slug);
  if (!page) notFound();
  return articleMetadata(page, `/solutions/${page.slug}`, 'website');
}

/** Keyword landing pages written in /admin, for example /solutions/ai-prospecting-for-agencies. */
export default async function SolutionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await findPublishedPage('LANDING_PAGE', slug);
  if (!page) notFound();
  return (
    <SiteShell>
      <ContentArticle
        article={page}
        section={{ label: 'Solutions', path: '/solutions', schema: 'page' }}
      />
    </SiteShell>
  );
}
