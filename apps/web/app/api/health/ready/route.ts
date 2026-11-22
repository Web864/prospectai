import { prisma } from '@prospectai/database';

export const dynamic = 'force-dynamic';

const requiredVariables = [
  'DATABASE_URL',
  'SESSION_SECRET',
  'EXTENSION_TOKEN_PEPPER',
  'GUEST_SESSION_PEPPER',
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_API_BASE_URL',
] as const;
const minimumSecretLength = 32;
const secrets = new Set(['SESSION_SECRET', 'EXTENSION_TOKEN_PEPPER', 'GUEST_SESSION_PEPPER']);

/**
 * Readiness check for deployments: reports which required settings are missing and whether the
 * database is reachable and migrated. It returns names and short reasons only, never values.
 */
export async function GET() {
  const problems: string[] = [];
  for (const name of requiredVariables) {
    const value = process.env[name]?.trim();
    if (!value) problems.push(`${name} is not set`);
    else if (secrets.has(name) && value.length < minimumSecretLength)
      problems.push(`${name} must be at least ${minimumSecretLength} characters`);
  }
  if (process.env.DATABASE_URL) {
    try {
      await prisma.user.count();
    } catch (error) {
      const code =
        error && typeof error === 'object' && 'code' in error ? String(error.code) : 'unknown';
      problems.push(
        code === 'P2021' || code === 'P2022'
          ? 'Database tables are missing: run "prisma migrate deploy" against DATABASE_URL'
          : `Database is not reachable or rejected the query (code ${code})`,
      );
    }
  }
  return Response.json(
    { status: problems.length === 0 ? 'ready' : 'not_ready', problems },
    { status: problems.length === 0 ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
