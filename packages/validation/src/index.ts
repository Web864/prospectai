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
