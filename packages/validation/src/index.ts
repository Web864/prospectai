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
