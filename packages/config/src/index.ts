import { z } from 'zod';

const runtimeSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  TRUST_PROXY: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

const databaseSchema = runtimeSchema.extend({
  DATABASE_URL: z
    .string()
    .url()
    .refine((value) => ['postgres:', 'postgresql:'].includes(new URL(value).protocol), {
      message: 'DATABASE_URL must use the postgres or postgresql protocol.',
    }),
});

const workerSchema = databaseSchema.extend({
  WORKER_ID: z.string().trim().min(1).max(100).optional(),
  WORKER_POLL_INTERVAL_MS: z.coerce.number().int().min(100).max(60_000).default(1_000),
  WORKER_LOCK_TIMEOUT_MS: z.coerce.number().int().min(10_000).max(3_600_000).default(300_000),
  WORKER_RECOVERY_INTERVAL_MS: z.coerce.number().int().min(10_000).max(3_600_000).default(60_000),
});

const authSchema = z.object({
  SESSION_SECRET: z.string().min(32),
  EXTENSION_TOKEN_PEPPER: z.string().min(32),
});

const guestSchema = z.object({
  GUEST_SESSION_PEPPER: z.string().min(32),
  GUEST_ANALYSIS_LIMIT: z.coerce.number().int().min(0).max(100).default(3),
  FREE_MONTHLY_ANALYSIS_LIMIT: z.coerce.number().int().min(0).max(100_000).default(10),
  PRO_MONTHLY_ANALYSIS_LIMIT: z.coerce.number().int().min(0).max(100_000).default(100),
  AGENCY_MONTHLY_ANALYSIS_LIMIT: z.coerce.number().int().min(0).max(100_000).default(500),
  GUEST_SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  GUEST_RESULT_RETENTION_DAYS: z.coerce.number().int().min(1).max(365).default(30),
});
const billingSchema = z.object({
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
  STRIPE_PRO_PRICE_ID: z.string().startsWith('price_'),
  STRIPE_AGENCY_PRICE_ID: z.string().startsWith('price_'),
});

const aiSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().min(1).default('gpt-4.1-mini'),
  OPENAI_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
});

const emailSchema = runtimeSchema.extend({
  EMAIL_PROVIDER: z.enum(['auto', 'development', 'resend']).default('auto'),
  RESEND_API_KEY: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().min(1).optional(),
  ),
  EMAIL_FROM: z.string().email().default('noreply@prospectai.local'),
});

const googleAuthSchema = z.object({
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_REDIRECT_URI: z.string().url(),
});

const publicSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_API_BASE_URL: z.string().url(),
});

export type ServerEnvironment = z.infer<typeof runtimeSchema>;
export type DatabaseEnvironment = z.infer<typeof databaseSchema>;
export type WorkerEnvironment = z.infer<typeof workerSchema>;
export type AuthEnvironment = z.infer<typeof authSchema>;
export type GuestEnvironment = z.infer<typeof guestSchema>;
export type BillingEnvironment = z.infer<typeof billingSchema>;
export type AiEnvironment = z.infer<typeof aiSchema>;
export type EmailEnvironment = z.infer<typeof emailSchema>;
export type GoogleAuthEnvironment = z.infer<typeof googleAuthSchema>;
export type PublicEnvironment = z.infer<typeof publicSchema>;

export const loadServerEnvironment = (environment: NodeJS.ProcessEnv = process.env) =>
  runtimeSchema.parse(environment);
export const loadDatabaseEnvironment = (environment: NodeJS.ProcessEnv = process.env) =>
  databaseSchema.parse(environment);
export const loadWorkerEnvironment = (environment: NodeJS.ProcessEnv = process.env) =>
  workerSchema.parse(environment);
export const loadAuthEnvironment = (environment: NodeJS.ProcessEnv = process.env) =>
  authSchema.parse(environment);
export const loadGuestEnvironment = (environment: NodeJS.ProcessEnv = process.env) =>
  guestSchema.parse(environment);
export const loadBillingEnvironment = (environment: NodeJS.ProcessEnv = process.env) =>
  billingSchema.parse(environment);
export const loadAiEnvironment = (environment: NodeJS.ProcessEnv = process.env) =>
  aiSchema.parse(environment);
export const loadEmailEnvironment = (environment: NodeJS.ProcessEnv = process.env) =>
  emailSchema.parse(environment);
export const loadGoogleAuthEnvironment = (environment: NodeJS.ProcessEnv = process.env) =>
  googleAuthSchema.parse(environment);
export const loadPublicEnvironment = (environment: NodeJS.ProcessEnv = process.env) =>
  publicSchema.parse(environment);
