import type { Metadata } from 'next';

export const siteName = 'ProspectAI';
export const siteTagline = 'Website intelligence for B2B prospecting';
export const siteDescription =
  'ProspectAI analyzes a business website, records the technical, SEO, accessibility, UX and conversion evidence it finds, and turns it into service opportunities and outreach drafts for freelancers, agencies and consultants.';

/** Canonical origin. Set NEXT_PUBLIC_APP_URL to the production domain (https, no trailing slash). */
export function siteUrl(): URL {
  try {
    return new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
  } catch {
    return new URL('http://localhost:3000');
  }
}

export const absoluteUrl = (path: string) => new URL(path, siteUrl()).toString();

export interface PublicPage {
  path: string;
  title: string;
  description: string;
  changeFrequency: 'weekly' | 'monthly' | 'yearly';
  priority: number;
}

/** Every indexable public page. Sitemap, canonical URLs and navigation derive from this list. */
export const publicPages: PublicPage[] = [
  {
    path: '/',
    title: `${siteName}: ${siteTagline}`,
    description: siteDescription,
    changeFrequency: 'weekly',
    priority: 1,
  },
  {
    path: '/how-it-works',
    title: 'How ProspectAI works: from website evidence to outreach',
    description:
      'See each step ProspectAI takes: a secure crawl of the public website, rule-based findings with evidence, deterministic scores, AI-assisted interpretation, and a pitch you review before sending.',
    changeFrequency: 'monthly',
    priority: 0.9,
  },
  {
    path: '/features',
    title: 'Features: website audits that become sales opportunities',
    description:
      'Technical, SEO, accessibility, mobile, trust and conversion checks with stored evidence, opportunity scoring, lead tracking, pitch drafts, PDF reports and a Chrome extension.',
    changeFrequency: 'monthly',
    priority: 0.9,
  },
  {
    path: '/pricing',
    title: 'Pricing: start free, upgrade when prospecting works',
    description:
      'Compare the Free, Pro and Agency plans and their monthly website analysis allowances. Start without a credit card and upgrade from your workspace.',
    changeFrequency: 'monthly',
    priority: 0.8,
  },
  {
    path: '/faq',
    title: 'ProspectAI FAQ: analysis, scoring, data and plans',
    description:
      'Plain answers about what ProspectAI analyzes, how opportunity scores work, how AI is used, what data is stored and what each plan includes.',
    changeFrequency: 'monthly',
    priority: 0.7,
  },
  {
    path: '/resources',
    title: 'Resources: prospecting with website evidence',
    description:
      'Practical guidance on turning website findings into credible outreach: which signals matter, how to read an opportunity score and how to validate a finding before you pitch.',
    changeFrequency: 'monthly',
    priority: 0.6,
  },
  {
    path: '/contact',
    title: 'Contact ProspectAI',
    description:
      'Reach the ProspectAI team for product questions, support, billing and privacy requests.',
    changeFrequency: 'yearly',
    priority: 0.4,
  },
  {
    path: '/privacy',
    title: 'Privacy policy',
    description: 'How ProspectAI collects, uses, stores and deletes account and analysis data.',
    changeFrequency: 'yearly',
    priority: 0.3,
  },
  {
    path: '/terms',
    title: 'Terms of service',
    description: 'The terms that govern use of the ProspectAI website, application and extension.',
    changeFrequency: 'yearly',
    priority: 0.3,
  },
];

export function publicPageMetadata(path: string): Metadata | null {
  const page = publicPages.find((entry) => entry.path === path);
  if (!page) return null;
  return {
    title: path === '/' ? { absolute: page.title } : page.title,
    description: page.description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      siteName,
      url: path,
      title: page.title,
      description: page.description,
    },
    twitter: { card: 'summary_large_image', title: page.title, description: page.description },
  };
}

export const privateMetadata = (title: string): Metadata => ({
  title,
  robots: { index: false, follow: false },
});
