import { ArrowLeft, ArrowRight, Clock } from 'lucide-react';
import Link from 'next/link';
import { renderMarkdown, readingMinutes } from '../lib/markdown';
import { StructuredData, articleStructuredData, breadcrumbStructuredData } from './structured-data';
import '../app/content.css';

export interface ArticleData {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  tags: string[];
  authorName: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: Date | null;
  updatedAt: Date;
}

export const dateLabel = (date: Date | null) =>
  date ? new Intl.DateTimeFormat('en', { dateStyle: 'long' }).format(date) : '';

/** Shared layout for blog posts and keyword landing pages. Markdown is rendered server side. */
export function ContentArticle({
  article,
  section,
}: {
  article: ArticleData;
  section: { label: string; path: string; schema: 'post' | 'page' };
}) {
  const { html, headings } = renderMarkdown(article.body);
  const path = `${section.path}/${article.slug}`;
  const toc = headings.filter((heading) => heading.level <= 3);
  return (
    <main className="content-page">
      <StructuredData
        data={[
          breadcrumbStructuredData(article.title, path),
          ...(section.schema === 'post'
            ? [
                articleStructuredData({
                  title: article.title,
                  description: article.seoDescription ?? article.excerpt,
                  path,
                  publishedAt: article.publishedAt,
                  updatedAt: article.updatedAt,
                  authorName: article.authorName,
                  tags: article.tags,
                }),
              ]
            : []),
        ]}
      />
      <div className="content-container article-layout">
        <article>
          <header className="article-head">
            {section.schema === 'post' && (
              <Link className="article-back" href={section.path}>
                <ArrowLeft size={16} aria-hidden="true" /> {section.label}
              </Link>
            )}
            <h1>{article.title}</h1>
            <p className="article-lead">{article.excerpt}</p>
            {section.schema === 'post' && (
              <div className="blog-meta">
                {article.authorName && <span>By {article.authorName}</span>}
                {article.publishedAt && (
                  <time dateTime={article.publishedAt.toISOString()}>
                    {dateLabel(article.publishedAt)}
                  </time>
                )}
                <span>
                  <Clock size={13} aria-hidden="true" /> {readingMinutes(article.body)} min read
                </span>
              </div>
            )}
            {article.tags.length > 0 && (
              <div className="blog-tags" style={{ marginTop: 14 }}>
                {article.tags.map((tag) => (
                  <span className="blog-tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </header>
          <div className="content-prose" dangerouslySetInnerHTML={{ __html: html }} />
        </article>
        <aside className="article-aside">
          {toc.length > 1 && (
            <nav className="article-toc" aria-label="On this page">
              <strong>On this page</strong>
              <ol>
                {toc.map((heading) => (
                  <li key={heading.id} className={heading.level > 2 ? 'is-sub' : undefined}>
                    <a href={`#${heading.id}`}>{heading.text}</a>
                  </li>
                ))}
              </ol>
            </nav>
          )}
          <div className="article-cta fx-card">
            <strong>Find clients with evidence</strong>
            <p>
              ProspectAI reads a business website and turns what it finds into service opportunities
              and a pitch you can send.
            </p>
            <Link className="button button-primary" href="/signup">
              Start free <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </aside>
      </div>
    </main>
  );
}

export function articleMetadata(article: ArticleData, path: string, type: 'article' | 'website') {
  const title = article.title;
  const description = article.seoDescription ?? article.excerpt;
  return {
    title: { absolute: `${article.seoTitle || title} | ProspectAI` },
    description,
    alternates: { canonical: path },
    openGraph: {
      type,
      url: path,
      title,
      description,
      ...(type === 'article' && article.publishedAt
        ? { publishedTime: article.publishedAt.toISOString(), tags: article.tags }
        : {}),
    },
    twitter: { card: 'summary_large_image' as const, title, description },
  };
}
