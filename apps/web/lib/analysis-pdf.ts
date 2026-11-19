import {
  AppError,
  analysisLimitations,
  auditCoverage,
  auditPages,
  type AuditPageSummary,
} from '@prospectai/shared';
import { componentWeights } from '@prospectai/scoring';
import type { Prisma } from '@prospectai/database';
import { unreadablePageText } from '@prospectai/crawler';
import { renderAnalysisPdf } from './analysis-pdf-render';

export interface AnalysisPdfReport {
  domain: string;
  url: string;
  analyzedAt: Date | null;
  status: 'COMPLETED' | 'PARTIAL';
  websiteScore: number | null;
  opportunityScore: number | null;
  confidence: number | null;
  summary: string | null;
  limitations: string[];
  coverage?: ReturnType<typeof auditCoverage>;
  scoringVersion?: string | null;
  componentScores?: Array<{ name: string; weight: number; score: number; findingCount: number }>;
  pages?: AuditPageSummary[];
  pitches?: Array<{ format: string; content: string }>;
  findings: Array<{
    category: string;
    title: string;
    description: string | null;
    evidence: string;
    sourceUrl: string | null;
    severity?: string;
    recommendation?: string | undefined;
    detectionType?: string | undefined;
    confidence?: number;
  }>;
  opportunities: Array<{
    title: string;
    serviceCategory: string;
    commercialReason: string;
    pitchAngle: string | null;
    opportunityScore: number;
    confidence: number;
    summary?: string | null;
    strength?: string | null;
  }>;
}

function componentScoreRows(stored: unknown, findings: Array<{ category: string }>) {
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return [];
  const scores = stored as Record<string, unknown>;
  return Object.entries(componentWeights).flatMap(([name, weight]) => {
    const score = scores[name];
    return typeof score === 'number' && Number.isFinite(score)
      ? [
          {
            name,
            weight,
            score: Math.round(score),
            findingCount: findings.filter((f) => f.category.toLowerCase() === name.toLowerCase())
              .length,
          },
        ]
      : [];
  });
}

export function persistedPdfReport(
  analysis: Prisma.WebsiteAnalysisGetPayload<{
    include: { website: true; findings: true; opportunities: true };
  }> & { pitches?: Array<{ format: string; content: string }> },
): AnalysisPdfReport {
  if (unreadablePageText(analysis.extractedText ?? ''))
    throw new AppError(
      'CONFLICT',
      'The stored page content is unreadable. Re-analyze this website before exporting.',
      409,
    );
  if (analysis.status !== 'COMPLETED' && analysis.status !== 'PARTIAL')
    throw new AppError('CONFLICT', 'A completed or partial report is required for export.', 409);
  return {
    domain: analysis.website.domain,
    url: analysis.website.canonicalUrl,
    analyzedAt: analysis.completedAt,
    status: analysis.status,
    websiteScore: analysis.websiteScore,
    opportunityScore: analysis.opportunityScore,
    confidence: analysis.confidence,
    summary: analysis.businessSummary,
    limitations: [
      ...analysisLimitations(analysis.status, analysis.aiStatus),
      ...(auditCoverage(analysis.auditSnapshot)?.limitations ?? []),
    ],
    coverage: auditCoverage(analysis.auditSnapshot),
    scoringVersion: analysis.scoringVersion,
    componentScores: componentScoreRows(analysis.componentScores, analysis.findings),
    pages: auditPages(analysis.auditSnapshot),
    pitches: (analysis.pitches ?? []).map(({ format, content }) => ({ format, content })),
    findings: analysis.findings.map((finding) => ({
      category: finding.category,
      severity: finding.severity,
      ...(finding.evidence &&
      typeof finding.evidence === 'object' &&
      !Array.isArray(finding.evidence)
        ? {
            recommendation:
              typeof finding.evidence.recommendation === 'string'
                ? finding.evidence.recommendation
                : undefined,
            detectionType:
              typeof finding.evidence.detectionType === 'string'
                ? finding.evidence.detectionType
                : undefined,
          }
        : {}),
      confidence: finding.confidence,
      title: finding.title,
      description: finding.description,
      sourceUrl: finding.sourceUrl,
      evidence:
        typeof finding.evidence === 'string'
          ? finding.evidence
          : finding.evidence &&
              typeof finding.evidence === 'object' &&
              'observation' in finding.evidence &&
              typeof finding.evidence.observation === 'string'
            ? finding.evidence.observation
            : '',
    })),
    opportunities: analysis.opportunities.map((item) => ({
      title: item.title,
      serviceCategory: item.serviceCategory,
      commercialReason: item.commercialReason,
      pitchAngle: item.pitchAngle,
      opportunityScore: item.opportunityScore,
      confidence: item.confidence,
      summary: item.summary,
      strength: item.strength,
    })),
  };
}

export function reportFilename(domain: string) {
  const safe =
    domain
      .normalize('NFKD')
      .replace(/[^a-zA-Z0-9.-]/g, '-')
      .replace(/^[.-]+/, '')
      .slice(0, 100) || 'prospect';
  return `ProspectAI-${safe}-analysis.pdf`;
}

export async function generateAnalysisPdf(report: AnalysisPdfReport, generatedAt = new Date()) {
  return renderAnalysisPdf(report, generatedAt);
}
