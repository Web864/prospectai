import type { FindingInput } from '@prospectai/types';

export const scoringVersion = 'website-v1';
export const opportunityScoringVersion = 'opportunity-v1';

const severityWeight = [0, 4, 9, 16, 25, 36] as const;
const componentWeights = {
  Technical: 0.2,
  SEO: 0.2,
  Performance: 0.15,
  Mobile: 0.15,
  Accessibility: 0.1,
  UX: 0.08,
  Conversion: 0.07,
  Trust: 0.03,
  Content: 0.02,
} as const;

export function calculateWebsiteComponents(findings: readonly FindingInput[]) {
  return Object.fromEntries(
    Object.keys(componentWeights).map((category) => {
      const penalties = findings
        .filter((finding) => finding.category.toLowerCase() === category.toLowerCase())
        .map(
          (finding) =>
            (severityWeight[Math.max(0, Math.min(5, Math.round(finding.severity)))] ?? 0) *
            finding.confidence,
        );
      return [
        category,
        Math.max(
          0,
          Math.round(
            100 -
              Math.min(
                100,
                penalties.reduce((a, b) => a + b, 0),
              ),
          ),
        ),
      ];
    }),
  ) as Record<keyof typeof componentWeights, number>;
}

export function calculateWebsiteScore(findings: readonly FindingInput[]) {
  const components = calculateWebsiteComponents(findings);
  return Math.round(
    Object.entries(componentWeights).reduce(
      (total, [category, weight]) =>
        total + components[category as keyof typeof components] * weight,
      0,
    ),
  );
}

export function calculateOpportunityScore(finding: FindingInput, serviceFit: number) {
  return Math.round(
    Math.max(
      0,
      Math.min(
        100,
        finding.severity * 10 +
          finding.confidence * 20 +
          finding.commercialRelevance * 25 +
          serviceFit * 15,
      ),
    ),
  );
}

const categoryService: Record<string, string> = {
  technical: 'Web Development',
  seo: 'SEO',
  performance: 'Performance Optimization',
  mobile: 'Web Design',
  accessibility: 'Accessibility',
  ux: 'UX Design',
  conversion: 'Conversion Optimization',
  trust: 'Brand Strategy',
  content: 'Content Strategy',
  business: 'Business Consulting',
};

export interface ServiceOpportunity {
  service: string;
  strength: 'low' | 'medium' | 'high';
  findingIndexes: number[];
  evidence: string[];
  commercialReason: string;
  pitchAngle: string;
  confidence: number;
  score: number;
}

function serviceFit(service: string, userServices: readonly string[]) {
  if (userServices.length === 0) return 0.55;
  const normalized = service.toLowerCase();
  return userServices.some(
    (candidate) =>
      candidate.toLowerCase().includes(normalized) || normalized.includes(candidate.toLowerCase()),
  )
    ? 1
    : 0.3;
}

export function recommendServices(
  findings: readonly FindingInput[],
  userServices: readonly string[] = [],
): ServiceOpportunity[] {
  const grouped = new Map<string, number[]>();
  findings.forEach((finding, index) => {
    const service = categoryService[finding.category.toLowerCase()] ?? 'Digital Consulting';
    grouped.set(service, [...(grouped.get(service) ?? []), index]);
  });
  return [...grouped.entries()]
    .map(([service, indexes]) => {
      const relevant = indexes.map((index) => findings[index]).filter(Boolean) as FindingInput[];
      const fit = serviceFit(service, userServices);
      const score = Math.round(
        relevant.reduce((total, finding) => total + calculateOpportunityScore(finding, fit), 0) /
          relevant.length,
      );
      const confidence = Number(
        (
          relevant.reduce((total, finding) => total + finding.confidence, 0) / relevant.length
        ).toFixed(2),
      );
      return {
        service,
        strength: score >= 75 ? 'high' : score >= 50 ? 'medium' : 'low',
        findingIndexes: indexes,
        evidence: relevant.map((finding) => finding.evidence).slice(0, 5),
        commercialReason: `${relevant.length} evidence-backed ${service.toLowerCase()} signal${relevant.length === 1 ? '' : 's'} may affect acquisition, trust, or conversion.`,
        pitchAngle: `Lead with the observed ${relevant[0]?.title.toLowerCase() ?? 'website signal'} and offer a scoped ${service.toLowerCase()} improvement.`,
        confidence,
        score,
      } satisfies ServiceOpportunity;
    })
    .filter((opportunity) => opportunity.score >= 35)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

export function aggregateOpportunityScore(opportunities: readonly ServiceOpportunity[]) {
  if (opportunities.length === 0) return 0;
  const top = opportunities.slice(0, 3);
  const weighted = top.reduce(
    (total, opportunity, index) => total + opportunity.score * (3 - index),
    0,
  );
  const divisor = top.reduce((total, _, index) => total + (3 - index), 0);
  return Math.round(weighted / divisor);
}
