import type { ExtractedPage } from '@prospectai/crawler';

export const evidenceEngineVersion = 'evidence-v1';

export type EvidenceSeverity = 1 | 2 | 3 | 4 | 5;

export interface DeterministicFinding {
  code: string;
  category: string;
  severity: EvidenceSeverity;
  confidence: number;
  commercialRelevance: number;
  title: string;
  description: string;
  evidence: { observation: string; value?: string | number; engineVersion: string };
  source: string;
  sourceUrl: string;
  deterministicScore: number;
}

function finding(
  page: ExtractedPage,
  input: Omit<DeterministicFinding, 'sourceUrl' | 'deterministicScore'>,
): DeterministicFinding {
  return {
    ...input,
    sourceUrl: page.url,
    deterministicScore: Number(
      (input.severity * input.confidence * input.commercialRelevance).toFixed(3),
    ),
  };
}

export function analyzePageEvidence(page: ExtractedPage): DeterministicFinding[] {
  const findings: DeterministicFinding[] = [];
  const add = (input: Omit<DeterministicFinding, 'sourceUrl' | 'deterministicScore'>) =>
    findings.push(finding(page, input));
  const evidence = (observation: string, value?: string | number) => ({
    observation,
    ...(value === undefined ? {} : { value }),
    engineVersion: evidenceEngineVersion,
  });

  if (!page.url.startsWith('https://'))
    add({
      code: 'technical.insecure-http',
      category: 'Technical',
      severity: 5,
      confidence: 1,
      commercialRelevance: 0.8,
      title: 'Website does not use HTTPS',
      description: 'Visitors and browsers cannot rely on an encrypted connection.',
      evidence: evidence('Final analyzed URL uses HTTP.', page.url),
      source: 'response',
    });
  if (!page.title)
    add({
      code: 'seo.missing-title',
      category: 'SEO',
      severity: 4,
      confidence: 1,
      commercialRelevance: 0.75,
      title: 'Page title is missing',
      description: 'The homepage does not provide a document title for search and browser context.',
      evidence: evidence('No non-empty title element was extracted.'),
      source: 'html',
    });
  if (!page.description)
    add({
      code: 'seo.missing-description',
      category: 'SEO',
      severity: 3,
      confidence: 1,
      commercialRelevance: 0.65,
      title: 'Meta description is missing',
      description: 'The homepage lacks a concise search-result description.',
      evidence: evidence('No meta description was extracted.'),
      source: 'html',
    });
  if (!page.headings.some((heading) => heading.length > 0))
    add({
      code: 'content.missing-headings',
      category: 'Content',
      severity: 3,
      confidence: 0.95,
      commercialRelevance: 0.65,
      title: 'Page hierarchy is unclear',
      description: 'No meaningful H1-H3 heading text was detected.',
      evidence: evidence('Extracted heading count.', page.headings.length),
      source: 'html',
    });
  if (!page.hasViewport)
    add({
      code: 'mobile.missing-viewport',
      category: 'Mobile',
      severity: 4,
      confidence: 1,
      commercialRelevance: 0.8,
      title: 'Mobile viewport configuration is missing',
      description: 'Mobile browsers may render the page at an unsuitable desktop width.',
      evidence: evidence('No viewport meta tag was detected.'),
      source: 'html',
    });
  if (!page.language)
    add({
      code: 'accessibility.missing-language',
      category: 'Accessibility',
      severity: 2,
      confidence: 1,
      commercialRelevance: 0.4,
      title: 'Document language is not declared',
      description: 'Assistive technology cannot reliably infer the page language.',
      evidence: evidence('The html element has no language attribute.'),
      source: 'html',
    });
  if (page.images > 0 && page.imagesWithoutAlt > 0)
    add({
      code: 'accessibility.image-alt',
      category: 'Accessibility',
      severity: page.imagesWithoutAlt === page.images ? 4 : 3,
      confidence: 0.95,
      commercialRelevance: 0.5,
      title: 'Images lack alternative text',
      description: 'Some images cannot be interpreted by screen readers or image search.',
      evidence: evidence('Images without alternative text.', page.imagesWithoutAlt),
      source: 'html',
    });
  if (page.ctas.length === 0)
    add({
      code: 'conversion.no-clear-cta',
      category: 'Conversion',
      severity: 4,
      confidence: 0.75,
      commercialRelevance: 0.9,
      title: 'No clear conversion action detected',
      description:
        'The homepage does not expose a recognizable contact, quote, demo, or start action.',
      evidence: evidence('Recognized CTA count.', 0),
      source: 'html',
    });
  if (page.forms === 0 && !page.links.some((link) => /contact|mailto:|tel:/i.test(link)))
    add({
      code: 'conversion.no-contact-path',
      category: 'Conversion',
      severity: 3,
      confidence: 0.8,
      commercialRelevance: 0.85,
      title: 'Contact path is difficult to find',
      description: 'No form, email, telephone, or contact link was detected on the homepage.',
      evidence: evidence('Forms and recognizable contact links were absent.'),
      source: 'html',
    });
  if (Object.keys(page.openGraph).length === 0)
    add({
      code: 'trust.missing-open-graph',
      category: 'Trust',
      severity: 2,
      confidence: 1,
      commercialRelevance: 0.45,
      title: 'Social sharing metadata is missing',
      description: 'Shared links may not present a controlled title, description, or image.',
      evidence: evidence('No Open Graph metadata was extracted.'),
      source: 'html',
    });
  if (page.responseTimeMs > 3_000)
    add({
      code: 'performance.slow-response',
      category: 'Performance',
      severity: page.responseTimeMs > 8_000 ? 5 : 3,
      confidence: 0.8,
      commercialRelevance: 0.7,
      title: 'Initial response is slow',
      description: 'The homepage response exceeded the V1 server-response threshold.',
      evidence: evidence('Measured crawler response time in milliseconds.', page.responseTimeMs),
      source: 'response',
    });

  return findings;
}
