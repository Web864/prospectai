import { z } from 'zod';

export const analysisRequestSchema = z.object({
  url: z.string().trim().url().max(2_048),
  forceRefresh: z.boolean().optional().default(false),
});

export const extensionAuthorizationRequestSchema = z.object({
  extensionVersion: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/)
    .max(32),
  codeChallenge: z.string().min(43).max(128),
  deviceName: z.string().trim().min(1).max(100).optional(),
  preferredProvider: z.enum(['google', 'account']).optional(),
  redirectUri: z
    .string()
    .url()
    .refine((value) => {
      const url = new URL(value);
      return url.protocol === 'https:' && url.hostname.endsWith('.chromiumapp.org');
    }, 'A Chrome identity redirect URI is required.'),
});

export const extensionAuthorizationExchangeSchema = z.object({
  code: z.string().min(43).max(256),
  codeVerifier: z.string().min(43).max(128),
});

export const extensionRefreshSchema = z.object({
  refreshToken: z.string().min(43).max(256),
});

export const aiBusinessAnalysisSchema = z.object({
  companyName: z.string().min(1).max(200),
  summary: z.string().min(1).max(1_500),
  confidence: z.number().min(0).max(1),
});

export const aiPitchSchema = z.object({
  subject: z.string().max(200).optional(),
  content: z.string().min(1).max(4_000),
});

export const aiOpportunitySchema = z.object({
  summary: z.string().min(1).max(1_500),
  opportunities: z
    .array(
      z.object({
        findingIds: z.array(z.string().cuid()).min(1),
        serviceCategory: z.string().min(1).max(80),
        rationale: z.string().min(1).max(800),
        confidence: z.number().min(0).max(1),
      }),
    )
    .max(10),
});

export type AnalysisRequest = z.infer<typeof analysisRequestSchema>;
export type ExtensionAuthorizationRequest = z.infer<typeof extensionAuthorizationRequestSchema>;
export const analysisJobStatusSchema = z.enum([
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
]);

export const analysisAcceptedResponseSchema = z.object({
  data: z.object({ jobId: z.string().min(1) }),
});

export const analysisJobProgressResponseSchema = z.object({
  data: z.object({
    id: z.string().min(1),
    analysisId: z.string().min(1),
    status: analysisJobStatusSchema,
    progress: z.number().int().min(0).max(100),
    attempt: z.number().int().nonnegative(),
    maxAttempts: z.number().int().positive(),
    nextAttemptAt: z.string().datetime(),
    startedAt: z.string().datetime().nullable(),
    finishedAt: z.string().datetime().nullable(),
    errorCode: z.string().nullable(),
    errorMessage: z.string().nullable(),
    updatedAt: z.string().datetime(),
  }),
});

export const leadCreateSchema = z.object({
  analysisId: z.string().cuid().optional(),
  name: z.string().trim().min(1).max(200).optional(),
  notes: z.string().trim().max(10_000).optional(),
  contacts: z
    .array(
      z.object({
        name: z.string().trim().max(200).optional(),
        email: z.string().trim().email().max(320).optional(),
        title: z.string().trim().max(200).optional(),
      }),
    )
    .max(20)
    .default([]),
});

export const leadUpdateSchema = z.object({
  status: z.enum(['new', 'contacted', 'qualified', 'won', 'lost', 'archived']).optional(),
  name: z.string().trim().min(1).max(200).nullable().optional(),
  notes: z.string().trim().max(10_000).nullable().optional(),
});

export const pitchCreateSchema = z.object({
  analysisId: z.string().cuid(),
  leadId: z.string().cuid().optional(),
  opportunityId: z.string().cuid(),
  format: z.enum(['cold_email', 'dm', 'linkedin', 'proposal', 'follow_up']).default('cold_email'),
});

export const pitchUpdateSchema = z.object({
  content: z.string().trim().min(1).max(4_000),
});

export const settingsUpdateSchema = z.object({
  displayName: z.string().trim().min(1).max(200).nullable().optional(),
  role: z.string().trim().max(100).nullable().optional(),
  services: z.array(z.string().trim().min(1).max(100)).max(30).optional(),
  industries: z.array(z.string().trim().min(1).max(100)).max(30).optional(),
  locations: z.array(z.string().trim().min(1).max(100)).max(30).optional(),
  icp: z.string().trim().max(1_000).nullable().optional(),
  agencyWebsite: z.string().trim().url().max(2_048).nullable().optional(),
  outreachPreferences: z.string().trim().max(1_000).nullable().optional(),
});

export const checkoutRequestSchema = z.object({
  plan: z.enum(['pro', 'agency']),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

export const leadStatusSchema = z.enum([
  'new',
  'contacted',
  'qualified',
  'won',
  'lost',
  'archived',
]);
export const subscriptionStatusSchema = z.enum([
  'trialing',
  'active',
  'past_due',
  'canceled',
  'unpaid',
  'incomplete',
]);
export const planCodeSchema = z.enum(['free', 'pro', 'agency']);

export const authCredentialsSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(200),
});
export const emailActionSchema = z.object({ email: z.string().trim().email().max(320) });
export const resetPasswordSchema = z.object({
  token: z.string().min(1).max(512),
  password: z.string().min(8).max(200),
});
export const actionResponseSchema = z.object({
  data: z.object({ message: z.string(), next: z.string().optional() }),
});
export const sessionResponseSchema = z.object({
  data: z.object({
    userId: z.string().min(1),
    email: z.string().email(),
    displayName: z.string().nullable(),
    organizationName: z.string(),
    role: z.enum(['owner', 'admin', 'member']),
    expiresAt: z.string().datetime(),
  }),
});

export const onboardingInputSchema = z.object({
  role: z.string().trim().min(1).max(100),
  services: z.array(z.string().trim().min(1).max(100)).min(1).max(30),
  industries: z.array(z.string().trim().min(1).max(100)).max(30).default([]),
  locations: z.array(z.string().trim().min(1).max(100)).max(30).default([]),
  icp: z.string().trim().max(1_000).optional(),
  agencyWebsite: z.string().trim().url().max(2_048).optional().or(z.literal('')),
  outreachPreferences: z.string().trim().max(1_000).optional(),
});

export const dashboardResponseSchema = z.object({
  data: z.object({
    analyses: z.number().int().nonnegative(),
    leads: z.number().int().nonnegative(),
    qualifiedOpportunities: z.number().int().nonnegative(),
    contactedProspects: z.number().int().nonnegative(),
    replies: z.number().int().nonnegative(),
    meetings: z.number().int().nonnegative(),
    wonClients: z.number().int().nonnegative(),
    analysesUsed: z.number().int().nonnegative(),
    analysesLimit: z.number().int().nonnegative().nullable(),
    plan: planCodeSchema,
    extensionConnected: z.boolean(),
    recentActivity: z.array(
      z.object({ id: z.string(), label: z.string(), occurredAt: z.string().datetime() }),
    ),
  }),
});

export const leadSummarySchema = z.object({
  id: z.string().min(1),
  name: z.string().nullable(),
  domain: z.string().nullable(),
  status: leadStatusSchema,
  opportunityScore: z.number().int().min(0).max(100).nullable(),
  latestAnalysisId: z.string().nullable(),
  updatedAt: z.string().datetime(),
});
export const leadListResponseSchema = z.object({
  data: z.array(leadSummarySchema),
  meta: z.object({ page: z.number().int().positive(), totalPages: z.number().int().nonnegative() }),
});
export const leadDetailResponseSchema = z.object({
  data: leadSummarySchema.extend({
    notes: z.string().nullable(),
    contacts: z.array(
      z.object({
        id: z.string(),
        name: z.string().nullable(),
        email: z.string().nullable(),
        title: z.string().nullable(),
      }),
    ),
    recommendedServices: z.array(
      z.object({ id: z.string(), title: z.string(), summary: z.string() }),
    ),
    latestAnalysis: z
      .object({
        id: z.string(),
        websiteScore: z.number().nullable(),
        completedAt: z.string().datetime().nullable(),
      })
      .nullable(),
    pitches: z.array(
      z.object({
        id: z.string(),
        format: z.string(),
        content: z.string(),
        updatedAt: z.string().datetime(),
      }),
    ),
    activity: z.array(
      z.object({ id: z.string(), label: z.string(), occurredAt: z.string().datetime() }),
    ),
  }),
});

export const analysisDetailResponseSchema = z.object({
  data: z.object({
    id: z.string(),
    status: analysisJobStatusSchema,
    domain: z.string(),
    companyName: z.string().nullable(),
    analyzedAt: z.string().datetime().nullable(),
    websiteScore: z.number().int().min(0).max(100).nullable(),
    opportunityScore: z.number().int().min(0).max(100).nullable(),
    confidence: z.number().min(0).max(1).nullable(),
    businessSummary: z.string().nullable(),
    findings: z.array(
      z.object({
        id: z.string(),
        category: z.string(),
        title: z.string(),
        evidence: z.string(),
        interpretation: z.string().nullable(),
      }),
    ),
    opportunities: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        serviceCategory: z.string(),
        summary: z.string(),
        opportunityScore: z.number().int().min(0).max(100),
        confidence: z.number().min(0).max(1),
        commercialReason: z.string(),
        pitchAngle: z.string().nullable(),
      }),
    ),
    pitches: z.array(z.object({ id: z.string(), format: z.string(), content: z.string() })),
  }),
});

export const usageResponseSchema = z.object({
  data: z.object({
    plan: planCodeSchema,
    used: z.number().int().nonnegative(),
    limit: z.number().int().nonnegative().nullable(),
    remaining: z.number().int().nonnegative().nullable(),
    periodStart: z.string().datetime(),
    periodEnd: z.string().datetime(),
    quotaReached: z.boolean(),
  }),
});
export const subscriptionResponseSchema = z.object({
  data: z.object({
    plan: planCodeSchema,
    status: subscriptionStatusSchema,
    currentPeriodEnd: z.string().datetime().nullable(),
    cancelAtPeriodEnd: z.boolean(),
  }),
});
export const settingsResponseSchema = z.object({
  data: z.object({
    displayName: z.string().nullable(),
    role: z.string().nullable(),
    services: z.array(z.string()),
    outreachPreferences: z.string().nullable(),
    extension: z.object({ connected: z.boolean(), status: z.string() }),
  }),
});

export type AuthCredentials = z.infer<typeof authCredentialsSchema>;
export type OnboardingInput = z.infer<typeof onboardingInputSchema>;
export const analysisListResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      domain: z.string(),
      status: analysisJobStatusSchema,
      websiteScore: z.number().int().min(0).max(100).nullable(),
      opportunityScore: z.number().int().min(0).max(100).nullable(),
      createdAt: z.string().datetime(),
    }),
  ),
});
export const opportunityListResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      analysisId: z.string(),
      title: z.string(),
      serviceCategory: z.string(),
      opportunityScore: z.number().int().min(0).max(100),
      confidence: z.number().min(0).max(1),
      domain: z.string(),
    }),
  ),
});
export const pitchListResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      analysisId: z.string().nullable(),
      leadId: z.string().nullable(),
      format: z.string(),
      content: z.string(),
      updatedAt: z.string().datetime(),
    }),
  ),
});
export const extensionAuthorizationCreatedSchema = z.object({
  data: z.object({
    id: z.string().min(1),
    authorizationUrl: z.string().url(),
    expiresAt: z.string().datetime(),
  }),
});
export const extensionTokenResponseSchema = z.object({
  data: z.object({
    accessToken: z.string().min(1),
    refreshToken: z.string().min(1),
    expiresAt: z.string().datetime(),
  }),
});

export const guestSessionStatusSchema = z.enum(['active', 'converted', 'expired', 'revoked']);
export const guestEntitlementSchema = z.object({
  mode: z.literal('guest'),
  trialLimit: z.number().int().nonnegative(),
  trialUsed: z.number().int().nonnegative(),
  trialRemaining: z.number().int().nonnegative(),
  quotaReached: z.boolean(),
});
export const guestSessionResponseSchema = z.object({
  data: guestEntitlementSchema.extend({
    sessionId: z.string().min(1),
    status: guestSessionStatusSchema,
    expiresAt: z.string().datetime(),
  }),
});
export const guestAnalysisAcceptedResponseSchema = z.object({
  data: z.object({
    jobId: z.string().min(1),
    analysisId: z.string().min(1),
    status: z.literal('queued'),
    entitlement: guestSessionResponseSchema.shape.data,
  }),
});
export const guestAnalysisResultResponseSchema = z.object({
  data: z.object({
    id: z.string().min(1),
    companyName: z.string().min(1),
    domain: z.string().min(1),
    opportunityScore: z.number().int().min(0).max(100).nullable(),
    reasoning: z.string().nullable(),
    keySignals: z.array(z.string()).max(8),
    recommendedNextAction: z.string().nullable(),
    status: analysisJobStatusSchema,
  }),
});
export const guestConversionRequestSchema = z.object({
  guestSessionId: z.string().min(1),
});

export const guestAnalysisRequestSchema = analysisRequestSchema;
export const trialRemainingSchema = z.object({
  trialLimit: z.number().int().nonnegative(),
  trialUsed: z.number().int().nonnegative(),
  trialRemaining: z.number().int().nonnegative(),
});
export const guestUsageSchema = trialRemainingSchema.extend({ quotaReached: z.boolean() });
export const guestConversionResponseSchema = z.object({
  data: z.object({
    converted: z.boolean(),
    alreadyConverted: z.boolean(),
    preservedAnalysisId: z.string().optional(),
  }),
});
export const authHandoffStatusSchema = z.enum([
  'pending',
  'approved',
  'completed',
  'expired',
  'canceled',
]);
export const authHandoffResponseSchema = z.object({
  data: z.object({
    requestId: z.string().min(1),
    authorizationUrl: z.string().url(),
    expiresAt: z.string().datetime(),
    status: authHandoffStatusSchema,
  }),
});
