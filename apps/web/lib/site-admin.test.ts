import { describe, expect, it } from 'vitest';
import { isSiteAdmin, siteAdminEmails } from './site-admin';
import { sitePageInputSchema, slugify } from './site-content';

describe('site admin access', () => {
  const environment = { SITE_ADMIN_EMAILS: ' Owner@Example.com, editor@example.com ' };

  it('parses the allowlist case-insensitively', () => {
    expect([...siteAdminEmails(environment)]).toEqual(['owner@example.com', 'editor@example.com']);
  });

  it('requires a verified, allowlisted email', () => {
    const verified = new Date();
    expect(
      isSiteAdmin({ email: 'owner@example.com', emailVerifiedAt: verified }, environment),
    ).toBe(true);
    expect(isSiteAdmin({ email: 'owner@example.com', emailVerifiedAt: null }, environment)).toBe(
      false,
    );
    expect(
      isSiteAdmin({ email: 'other@example.com', emailVerifiedAt: verified }, environment),
    ).toBe(false);
  });

  it('denies everyone when the allowlist is empty', () => {
    expect(isSiteAdmin({ email: 'owner@example.com', emailVerifiedAt: new Date() }, {})).toBe(
      false,
    );
  });
});

describe('site content validation', () => {
  it('slugifies titles into URL-safe paths', () => {
    expect(slugify('  Why Claude?  Agencies & AI — 2026 ')).toBe('why-claude-agencies-ai-2026');
  });

  it('normalises tags and empty SEO fields', () => {
    const parsed = sitePageInputSchema.parse({
      kind: 'BLOG_POST',
      title: 'A title',
      slug: 'A Title!',
      excerpt: 'A summary long enough.',
      body: 'A body that is long enough to pass.',
      tags: 'Claude, claude , AI,,',
      seoTitle: '  ',
      seoDescription: '',
      authorName: '',
      status: 'DRAFT',
    });
    expect(parsed.slug).toBe('a-title');
    expect(parsed.tags).toEqual(['Claude', 'claude', 'AI']);
    expect(parsed.seoTitle).toBeNull();
  });
});
