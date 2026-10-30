import { describe, it, expect } from 'vitest';
import { calculateAnalysisConfidence, calculateWebsiteScore } from '../src/index';
describe('evidence severity and coverage', () => {
  it('does not present near-certainty from a single page or unavailable AI', () => {
    expect(calculateAnalysisConfidence(0.99, 1, true, 0)).toBe(0.65);
    expect(calculateAnalysisConfidence(0.99, 1, false, 0)).toBeLessThan(0.65);
    expect(calculateAnalysisConfidence(0.99, 4, true, 0)).toBe(0.9);
  });
  it('lets a critical public evidence finding materially cap the score', () => {
    expect(
      calculateWebsiteScore([
        {
          code: 'critical',
          category: 'Conversion',
          severity: 5,
          confidence: 1,
          commercialRelevance: 1,
          title: 'Critical',
          evidence: 'Observed',
        },
      ]),
    ).toBeLessThanOrEqual(64);
  });
});
