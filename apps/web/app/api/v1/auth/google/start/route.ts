import { hashSecret, newOpaqueToken, codeChallengeFor } from '@prospectai/auth';
import { apiError, requestId } from '@prospectai/api';
import { loadAuthEnvironment, loadGoogleAuthEnvironment } from '@prospectai/config';
import { prisma } from '@prospectai/database';
import { AppError } from '@prospectai/shared';
import { googleOAuthCookie, sealGoogleOAuthState } from '../../../../../../lib/google-oauth';
import { enforceRateLimit } from '../../../../../../lib/rate-limit';

export async function GET(request: Request) {
  const id = requestId(request.headers);
  try {
    await enforceRateLimit(request, 'auth.google.start', 10, 15 * 60_000);
    const requestPublicId = new URL(request.url).searchParams.get('request');
    if (!requestPublicId)
      throw new AppError(
        'AUTH_HANDOFF_INVALID',
        'Extension authorization request is required.',
        400,
      );
    const authorization = await prisma.extensionAuthorizationRequest.findUnique({
      where: { publicId: requestPublicId },
    });
    if (
      !authorization ||
      authorization.status !== 'PENDING' ||
      authorization.expiresAt <= new Date()
    )
      throw new AppError('AUTH_HANDOFF_EXPIRED', 'Extension authorization request expired.', 401);

    let google;
    try {
      google = loadGoogleAuthEnvironment();
    } catch {
      throw new AppError('BACKEND_UNAVAILABLE', 'Google sign-in is not configured.', 503);
    }
    const state = newOpaqueToken();
    const verifier = newOpaqueToken();
    const expiresAt = Date.now() + 10 * 60_000;
    const updated = await prisma.extensionAuthorizationRequest.updateMany({
      where: { id: authorization.id, status: 'PENDING' },
      data: {
        authorizationCodeHash: hashSecret(state, loadAuthEnvironment().SESSION_SECRET),
      },
    });
    if (updated.count !== 1)
      throw new AppError('AUTH_HANDOFF_INVALID', 'Authorization request is no longer active.', 409);

    const target = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    target.searchParams.set('client_id', google.GOOGLE_CLIENT_ID);
    target.searchParams.set('redirect_uri', google.GOOGLE_REDIRECT_URI);
    target.searchParams.set('response_type', 'code');
    target.searchParams.set('scope', 'openid email profile');
    target.searchParams.set('state', state);
    target.searchParams.set('code_challenge', codeChallengeFor(verifier));
    target.searchParams.set('code_challenge_method', 'S256');
    target.searchParams.set('prompt', 'select_account');

    return new Response(null, {
      status: 302,
      headers: {
        Location: target.toString(),
        'Set-Cookie': googleOAuthCookie(
          sealGoogleOAuthState({ state, verifier, requestId: requestPublicId, expiresAt }),
        ),
        'Cache-Control': 'no-store',
        'X-Request-Id': id,
      },
    });
  } catch (error) {
    return apiError(error, id);
  }
}
