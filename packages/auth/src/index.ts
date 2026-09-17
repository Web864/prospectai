import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { AppError } from '@prospectai/shared';
import type { ActorContext, MembershipRole } from '@prospectai/types';

export const hashSecret = (value: string, pepper: string) =>
  createHash('sha256').update(`${pepper}:${value}`).digest('hex');
export const newOpaqueToken = () => randomBytes(32).toString('base64url');
export const verifySecret = (value: string, expectedHash: string, pepper: string) => {
  const actual = Buffer.from(hashSecret(value, pepper));
  const expected = Buffer.from(expectedHash);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};

export const codeChallengeFor = (verifier: string) =>
  createHash('sha256').update(verifier).digest('base64url');
export const verifyPkce = (verifier: string, challenge: string) => {
  const actual = Buffer.from(codeChallengeFor(verifier));
  const expected = Buffer.from(challenge);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};

export interface SessionResolver {
  resolveWebSession(token: string): Promise<ActorContext | null>;
  resolveExtensionToken(token: string): Promise<ActorContext | null>;
}

export async function requireActor(
  resolver: SessionResolver,
  authorization: string | null,
  webSessionToken?: string,
): Promise<ActorContext> {
  const bearer = authorization?.match(/^Bearer (.+)$/i)?.[1];
  const actor = bearer
    ? await resolver.resolveExtensionToken(bearer)
    : webSessionToken
      ? await resolver.resolveWebSession(webSessionToken)
      : null;
  if (!actor) throw new AppError('UNAUTHENTICATED', 'Authentication is required.', 401);
  return actor;
}

const roleWeight: Record<MembershipRole, number> = { member: 1, admin: 2, owner: 3 };
export function requireRole(actor: ActorContext, minimum: MembershipRole) {
  if (roleWeight[actor.role] < roleWeight[minimum])
    throw new AppError('FORBIDDEN', 'You do not have permission for this action.', 403);
}
