export const membershipRoles = ['owner', 'admin', 'member'] as const;
export type MembershipRole = (typeof membershipRoles)[number];

export const analysisJobStatuses = [
  'queued',
  'validating',
  'fetching',
  'rendering',
  'extracting',
  'rule_analysis',
  'ai_processing',
  'opportunity_scoring',
  'completed',
  'partial',
  'failed',
  'cancelled',
  'retry_pending',
  'retrying',
] as const;
export type AnalysisJobStatus = (typeof analysisJobStatuses)[number];

export const usageOperations = ['reserved', 'consumed', 'released', 'reversed'] as const;
export type UsageOperation = (typeof usageOperations)[number];

export interface ActorContext {
  userId: string;
  organizationId: string;
  role: MembershipRole;
  source: 'web' | 'extension' | 'system';
}

export interface AnalysisJobPayload {
  jobId: string;
  analysisId: string;
  organizationId: string;
  actorUserId: string;
}

export interface FindingInput {
  code: string;
  category: string;
  severity: number;
  confidence: number;
  commercialRelevance: number;
  title: string;
  evidence: string;
}
