import { z } from 'zod';

const serverSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  SESSION_SECRET: z.string().min(32),
  EXTENSION_TOKEN_PEPPER: z.string().min(32),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_').optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_').optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
});
const publicSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_API_BASE_URL: z.string().url(),
});

export type ServerEnvironment = z.infer<typeof serverSchema>;
export type PublicEnvironment = z.infer<typeof publicSchema>;
export const loadServerEnvironment = (environment: NodeJS.ProcessEnv = process.env) =>
  serverSchema.parse(environment);
export const loadPublicEnvironment = (environment: NodeJS.ProcessEnv = process.env) =>
  publicSchema.parse(environment);
