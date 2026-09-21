import { createHash } from 'node:crypto';
import { loadServerEnvironment } from '@prospectai/config';
import { prisma } from '@prospectai/database';
import { AppError } from '@prospectai/shared';

function requestIdentity(request: Request) {
  if (!loadServerEnvironment().TRUST_PROXY) return 'direct-client';
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || request.headers.get('x-real-ip') || 'unknown-proxy-client';
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
