import type { ExtractedPage } from '@prospectai/crawler';

export const evidenceEngineVersion = 'evidence-v2';

export type EvidenceSeverity = 1 | 2 | 3 | 4 | 5;

export interface DeterministicFinding {
  code: string;
  category: string;
  severity: EvidenceSeverity;
  confidence: number;
  commercialRelevance: number;
  title: string;
  description: string;
  evidence: {
    observation: string;
    value?: string | number;
    engineVersion: string;
    recommendation?: string;
    detectionType?: 'DETERMINISTIC' | 'HEURISTIC';
  };
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
    evidence: {
      ...input.evidence,
      detectionType: input.confidence < 1 ? 'HEURISTIC' : 'DETERMINISTIC',
      recommendation:
        input.evidence.recommendation ??
        `Review ${input.title.toLowerCase()} on the cited page and verify the appropriate change.`,
    },
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
      description:
        'No description metadata was found. Search engines may instead generate a snippet from page content; this is not a proven ranking penalty.',
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
  if (page.images > 0 && (page.audit?.missingAlt ?? page.imagesWithoutAlt) > 0)
    add({
      code: 'accessibility.image-alt',
      category: 'Accessibility',
      severity: page.imagesWithoutAlt === page.images ? 4 : 3,
      confidence: 0.95,
      commercialRelevance: 0.5,
      title: 'Images lack alternative text',
      description: 'Some images cannot be interpreted by screen readers or image search.',
      evidence: evidence(
        'Images missing the alt attribute (empty decorative alt is allowed).',
        page.audit?.missingAlt ?? page.imagesWithoutAlt,
      ),
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

  if (page.audit) {
    const audit = page.audit;
    const checks: Array<[boolean, string, string, EvidenceSeverity, string, string, string]> = [
      [
        audit.h1Count === 0,
        'seo.missing-h1',
        'SEO',
        2,
        'No H1 heading detected',
        'No H1 was extracted; review whether the page has a clear primary heading.',
        'Provide a descriptive primary heading where appropriate.',
      ],
      [
        audit.headingSkips > 0,
        'accessibility.heading-order',
        'Accessibility',
        2,
        'Heading levels skip',
        `${audit.headingSkips} heading-level skips were detected.`,
        'Review headings for a logical nested structure.',
      ],
      [
        audit.unlabeledInputs > 0,
        'accessibility.form-label',
        'Accessibility',
        4,
        'Form controls lack detectable labels',
        `${audit.unlabeledInputs} controls had no associated label or accessible name.`,
        'Associate a meaningful label or accessible name with each control.',
      ],
      [
        audit.unnamedButtons > 0,
        'accessibility.button-name',
        'Accessibility',
        3,
        'Buttons lack detectable names',
        `${audit.unnamedButtons} buttons had no detectable accessible name.`,
        'Provide meaningful button text or an accessible label.',
      ],
      [
        audit.emptyLinks > 0,
        'accessibility.link-name',
        'Accessibility',
        3,
        'Links lack detectable names',
        `${audit.emptyLinks} links had no detectable accessible name.`,
        'Give links meaningful text or an accessible name.',
      ],
      [
        audit.invalidAria > 0,
        'accessibility.invalid-aria',
        'Accessibility',
        3,
        'Invalid aria-hidden values',
        `${audit.invalidAria} aria-hidden attributes were neither true nor false.`,
        'Use valid ARIA attribute values.',
      ],
      [
        audit.placeholderText,
        'content.placeholder',
        'Content',
        4,
        'Placeholder content detected',
        'Public page text contains a recognized placeholder phrase.',
        'Replace unfinished placeholder copy with verified business content.',
      ],
      [
        audit.repeatedDescriptions > 0,
        'content.repeated-description',
        'Content',
        2,
        'Repeated descriptions detected',
        `${audit.repeatedDescriptions} repeated long descriptions appeared in article/section paragraphs.`,
        'Review repeated content; intentional repetition is not necessarily an issue.',
      ],
      [
        audit.homeCtas >= 3,
        'conversion.home-cta',
        'Conversion',
        3,
        'Multiple CTAs return to the homepage',
        `${audit.homeCtas} recognized CTA links resolve to the site root without a fragment.`,
        'Check that each CTA leads to its intended next step.',
      ],
      [
        /noindex/i.test(audit.robots ?? ''),
        'seo.noindex',
        'SEO',
        2,
        'Page declares noindex',
        `Observed robots directive: ${audit.robots}`,
        'Confirm whether exclusion from search indexing is intentional.',
      ],
    ];
    for (const [present, code, category, severity, title, observation, recommendation] of checks)
      if (present)
        add({
          code,
          category,
          severity,
          title,
          confidence:
            code.includes('placeholder') || code.includes('repeated') || code.includes('cta')
              ? 0.75
              : 1,
          commercialRelevance: 0.5,
          description:
            'This public HTML observation requires contextual review; it does not establish purchase intent.',
          evidence: { ...evidence(observation), recommendation },
          source: 'html',
        });
  }
  return findings;
}

export function analyzeSiteEvidence(pages: ExtractedPage[]): DeterministicFinding[] {
  const findings = pages.flatMap(analyzePageEvidence);
  for (const field of ['title', 'description'] as const) {
    const grouped = new Map<string, ExtractedPage[]>();
    for (const page of pages) {
      const value = page[field]?.trim().toLowerCase();
      if (value) grouped.set(value, [...(grouped.get(value) ?? []), page]);
    }
    for (const duplicates of grouped.values())
      if (duplicates.length > 1) {
        findings.push(
          finding(duplicates[0]!, {
            code: `seo.repeated-${field}`,
            category: 'SEO',
            severity: 2,
            confidence: 0.8,
            commercialRelevance: 0.4,
            title: `Repeated ${field} across retrieved pages`,
            description:
              'Repeated metadata can be intentional; review whether it accurately distinguishes these pages.',
            evidence: {
              observation: `${duplicates.length} retrieved pages share the same ${field}: ${duplicates.map((page) => page.url).join(', ')}`,
              engineVersion: evidenceEngineVersion,
              recommendation: 'Use page-specific metadata where the page purpose differs.',
            },
            source: 'html',
          }),
        );
      }
  }
  return findings;
}
