import { z } from 'zod';

const runtimeSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
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

const billingSchema = z.object({
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
});

const aiSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
});

const emailSchema = z.object({
  RESEND_API_KEY: z.string().min(1),
});

const publicSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_API_BASE_URL: z.string().url(),
});

export type ServerEnvironment = z.infer<typeof runtimeSchema>;
export type DatabaseEnvironment = z.infer<typeof databaseSchema>;
export type WorkerEnvironment = z.infer<typeof workerSchema>;
export type AuthEnvironment = z.infer<typeof authSchema>;
export type BillingEnvironment = z.infer<typeof billingSchema>;
export type AiEnvironment = z.infer<typeof aiSchema>;
export type EmailEnvironment = z.infer<typeof emailSchema>;
export type PublicEnvironment = z.infer<typeof publicSchema>;

export const loadServerEnvironment = (environment: NodeJS.ProcessEnv = process.env) =>
  runtimeSchema.parse(environment);
export const loadDatabaseEnvironment = (environment: NodeJS.ProcessEnv = process.env) =>
  databaseSchema.parse(environment);
export const loadWorkerEnvironment = (environment: NodeJS.ProcessEnv = process.env) =>
  workerSchema.parse(environment);
export const loadAuthEnvironment = (environment: NodeJS.ProcessEnv = process.env) =>
  authSchema.parse(environment);
export const loadBillingEnvironment = (environment: NodeJS.ProcessEnv = process.env) =>
  billingSchema.parse(environment);
export const loadAiEnvironment = (environment: NodeJS.ProcessEnv = process.env) =>
  aiSchema.parse(environment);
export const loadEmailEnvironment = (environment: NodeJS.ProcessEnv = process.env) =>
  emailSchema.parse(environment);
export const loadPublicEnvironment = (environment: NodeJS.ProcessEnv = process.env) =>
  publicSchema.parse(environment);
