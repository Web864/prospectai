import { ArrowRight, Clock, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { dateLabel } from '../../components/content-article';
import { PublicPage } from '../../components/public-page';
import { readingMinutes } from '../../lib/markdown';
import { listPublishedPages } from '../../lib/site-content';
import { publicPageMetadata } from '../../lib/site-metadata';
import '../content.css';

export const metadata = publicPageMetadata('/blog') ?? {};
export const revalidate = 60;

export default async function BlogIndex() {
  const posts = await listPublishedPages('BLOG_POST');
  return (
    <PublicPage path="/blog">
      <main className="content-page">
        <div className="content-container">
          <header className="content-hero">
            <span className="content-eyebrow">
              <Sparkles size={14} aria-hidden="true" /> The ProspectAI blog
            </span>
            <h1>
              Opinions on AI, agents and <span className="fx-gradient-text">Claude</span>
            </h1>
            <p>
              Field notes on using AI to win and serve clients: what works, what is hype, and how
              tools like Claude change the way agencies and consultants sell.
            </p>
          </header>
          {posts.length === 0 ? (
            <p className="content-empty">The first posts are being written. Check back soon.</p>
          ) : (
            <div className="blog-grid">
              {posts.map((post, index) => (
                <Link
                  className={`blog-card${index === 0 ? ' is-featured' : ''}`}
                  href={`/blog/${post.slug}`}
                  key={post.slug}
                >
                  <div className="blog-meta">
                    {post.publishedAt && (
                      <time dateTime={post.publishedAt.toISOString()}>
                        {dateLabel(post.publishedAt)}
                      </time>
                    )}
                    <span>
                      <Clock size={13} aria-hidden="true" /> {readingMinutes(post.body)} min read
                    </span>
                  </div>
                  <h2>{post.title}</h2>
                  <p>{post.excerpt}</p>
                  {post.tags.length > 0 && (
                    <div className="blog-tags">
                      {post.tags.slice(0, 4).map((tag) => (
                        <span className="blog-tag" key={tag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <span className="blog-more">
                    Read the post <ArrowRight size={15} aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </PublicPage>
  );
}
