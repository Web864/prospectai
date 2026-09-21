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

export const leadStatuses = ['new', 'contacted', 'qualified', 'won', 'lost', 'archived'] as const;
export type LeadStatus = (typeof leadStatuses)[number];

export const subscriptionStatuses = [
  'trialing',
  'active',
  'past_due',
  'canceled',
  'unpaid',
  'incomplete',
] as const;
export type SubscriptionStatus = (typeof subscriptionStatuses)[number];

export type PlanCode = 'free' | 'pro' | 'agency';

export interface SessionSummary {
  userId: string;
  email: string;
  displayName: string | null;
  organizationName: string;
  role: MembershipRole;
  expiresAt: string;
}

export interface DashboardSummary {
  analyses: number;
  leads: number;
  qualifiedOpportunities: number;
  contactedProspects: number;
  replies: number;
  meetings: number;
  wonClients: number;
  analysesUsed: number;
  analysesLimit: number | null;
  plan: PlanCode;
  extensionConnected: boolean;
  recentActivity: Array<{ id: string; label: string; occurredAt: string }>;
}

export interface LeadSummary {
  id: string;
  name: string | null;
  domain: string | null;
  status: LeadStatus;
  opportunityScore: number | null;
  latestAnalysisId: string | null;
  updatedAt: string;
}

export interface AnalysisFinding {
  id: string;
  category: string;
  title: string;
  evidence: string;
  interpretation: string | null;
}

export interface AnalysisOpportunity {
  id: string;
  title: string;
  serviceCategory: string;
  summary: string;
  opportunityScore: number;
  confidence: number;
  commercialReason: string;
  pitchAngle: string | null;
}

export const guestSessionStatuses = ['active', 'converted', 'expired', 'revoked'] as const;
export type GuestSessionStatus = (typeof guestSessionStatuses)[number];

export interface TrialRemaining {
  trialLimit: number;
  trialUsed: number;
  trialRemaining: number;
}

export interface GuestUsage extends TrialRemaining {
  quotaReached: boolean;
}

export interface GuestEntitlement extends GuestUsage {
  mode: 'guest';
}

export interface GuestSession extends GuestEntitlement {
  sessionId: string;
  status: GuestSessionStatus;
  expiresAt: string;
}

export type GuestSessionSummary = GuestSession;

export interface GuestAnalysisRequest {
  url: string;
  forceRefresh?: boolean;
}

export interface GuestAnalysisResult {
  id: string;
  companyName: string;
  domain: string;
  opportunityScore: number | null;
  reasoning: string | null;
  keySignals: string[];
  recommendedNextAction: string | null;
  status: AnalysisJobStatus;
}

export interface GuestConversion {
  guestSessionId: string;
  converted: boolean;
  alreadyConverted: boolean;
  preservedAnalysisId?: string;
}

export const authHandoffStatuses = [
  'pending',
  'approved',
  'completed',
  'expired',
  'canceled',
] as const;
export type AuthHandoffStatus = (typeof authHandoffStatuses)[number];

export interface AuthHandoff {
  requestId: string;
  authorizationUrl: string;
  expiresAt: string;
  status: AuthHandoffStatus;
}
