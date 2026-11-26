import { createHash } from 'node:crypto';
import { loadServerEnvironment } from '@prospectai/config';
import { prisma } from '@prospectai/database';
import { AppError } from '@prospectai/shared';

const firstForwarded = (value: string | null) => value?.split(',')[0]?.trim() || undefined;

/**
 * Resolves the client identity used for anonymous rate limits.
 *
 * Route handlers cannot read the socket address, so the client IP must come from a header that
 * the edge in front of the app overwrites. Vercel always rewrites `x-forwarded-for` and sets
 * `x-vercel-forwarded-for`/`x-real-ip`, so those are trusted automatically when `VERCEL=1`.
 * Behind any other proxy set `TRUST_PROXY=true` only when that proxy overwrites the header.
 * Without either, every anonymous caller shares one bucket, which is safe but strict.
 */
export function requestIdentity(
  request: Request,
  environment: Record<string, string | undefined> = process.env,
): string {
  const onVercel = environment.VERCEL === '1';
  if (!onVercel && !loadServerEnvironment(environment as NodeJS.ProcessEnv).TRUST_PROXY)
    return 'direct-client';
  const address =
    (onVercel ? firstForwarded(request.headers.get('x-vercel-forwarded-for')) : undefined) ??
    firstForwarded(request.headers.get('x-forwarded-for')) ??
    request.headers.get('x-real-ip')?.trim();
  return address ? `ip:${address}` : 'unknown-proxy-client';
}

export async function enforceRateLimit(
  request: Request,
  action: string,
  limit: number,
  windowMs: number,
  identity = requestIdentity(request),
) {
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs);
  const expiresAt = new Date(windowStart.getTime() + windowMs * 2);
  const keyHash = createHash('sha256').update(identity).digest('hex');
  const bucket = await prisma.rateLimitBucket.upsert({
    where: { keyHash_action_windowStart: { keyHash, action, windowStart } },
    create: { keyHash, action, windowStart, expiresAt, count: 1 },
    update: { count: { increment: 1 }, expiresAt },
  });
  if (bucket.count > limit)
    throw new AppError('RATE_LIMITED', 'Too many requests. Try again later.', 429, {
      retryAfterSeconds: Math.max(1, Math.ceil((windowStart.getTime() + windowMs - now) / 1_000)),
    });
}
