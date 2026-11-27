import { absoluteUrl, siteDescription, siteName } from '../lib/site-metadata';

type JsonLd = Record<string, unknown>;

/** Renders schema.org JSON-LD. `<` is escaped so page content can never close the script tag. */
export function StructuredData({ data }: { data: JsonLd | JsonLd[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}

export function homepageStructuredData(): JsonLd {
  const organizationId = absoluteUrl('/#organization');
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': organizationId,
        name: siteName,
        url: absoluteUrl('/'),
        logo: absoluteUrl('/brand-mark.png'),
      },
      {
        '@type': 'WebSite',
        '@id': absoluteUrl('/#website'),
        name: siteName,
        url: absoluteUrl('/'),
        publisher: { '@id': organizationId },
      },
      {
        '@type': 'SoftwareApplication',
        name: siteName,
        url: absoluteUrl('/'),
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web, Google Chrome',
        description: siteDescription,
        publisher: { '@id': organizationId },
      },
    ],
  };
}

export function breadcrumbStructuredData(name: string, path: string): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: siteName, item: absoluteUrl('/') },
      { '@type': 'ListItem', position: 2, name, item: absoluteUrl(path) },
    ],
  };
}

export function faqStructuredData(questions: ReadonlyArray<readonly [string, string]>): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map(([question, answer]) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  };
}

export function articleStructuredData(input: {
  title: string;
  description: string;
  path: string;
  publishedAt: Date | null;
  updatedAt: Date;
  authorName: string | null;
  tags: string[];
}): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: input.title,
    description: input.description,
    url: absoluteUrl(input.path),
    mainEntityOfPage: absoluteUrl(input.path),
    ...(input.publishedAt ? { datePublished: input.publishedAt.toISOString() } : {}),
    dateModified: input.updatedAt.toISOString(),
    author: input.authorName
      ? { '@type': 'Person', name: input.authorName }
      : { '@type': 'Organization', name: siteName },
    publisher: {
      '@type': 'Organization',
      name: siteName,
      logo: { '@type': 'ImageObject', url: absoluteUrl('/brand-mark.png') },
    },
    keywords: input.tags.join(', '),
  };
}
