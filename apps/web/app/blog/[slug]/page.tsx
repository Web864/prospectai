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
  const post = await findPublishedPage('BLOG_POST', slug);
  if (!post) notFound();
  return articleMetadata(post, `/blog/${post.slug}`, 'article');
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await findPublishedPage('BLOG_POST', slug);
  if (!post) notFound();
  return (
    <SiteShell activePath="/blog">
      <ContentArticle
        article={post}
        section={{ label: 'All posts', path: '/blog', schema: 'post' }}
      />
    </SiteShell>
  );
}
