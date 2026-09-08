import type { FindingInput } from '@prospectai/types';

export const scoringVersion = 'v1';
export function calculateWebsiteScore(findings: readonly FindingInput[]) {
  if (findings.length === 0) return 100;
  const weightedPenalty = findings.reduce(
    (total, finding) => total + finding.severity * finding.confidence,
    0,
  );
  return Math.max(0, Math.min(100, Math.round(100 - (weightedPenalty / findings.length) * 20)));
}
export function calculateOpportunityScore(finding: FindingInput, serviceFit: number) {
  return Math.round(
    Math.max(
      0,
      Math.min(
        100,
        finding.severity * 15 +
          finding.confidence * 25 +
          finding.commercialRelevance * 35 +
          serviceFit * 25,
      ),
    ),
  );
}
