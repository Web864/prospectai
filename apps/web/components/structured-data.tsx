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
