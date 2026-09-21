import { describe, expect, it } from 'vitest';
import { calculateOpportunityScore, calculateWebsiteScore } from '../src/index.js';

describe('scoring', () => {
  it('produces bounded deterministic scores', () => {
    const finding = {
      code: 'missing-title',
      category: 'seo',
      severity: 3,
      confidence: 0.8,
      commercialRelevance: 0.7,
      title: 'Missing title',
      evidence: 'No title element.',
    };
    expect(calculateWebsiteScore([finding])).toBe(97);
    expect(calculateOpportunityScore(finding, 0.9)).toBe(77);
  });
});
