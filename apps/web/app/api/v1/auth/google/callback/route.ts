import { hashSecret } from '@prospectai/auth';
import { apiError, requestId } from '@prospectai/api';
import { loadAuthEnvironment, loadGoogleAuthEnvironment } from '@prospectai/config';
import { prisma } from '@prospectai/database';
import { AppError } from '@prospectai/shared';
import {
  createWebSession,
  findOrCreateGoogleAccount,
  sessionCookie,
} from '../../../../../../lib/auth-service';
import { writeAudit } from '../../../../../../lib/audit';
import {
  clearGoogleOAuthCookie,
  openGoogleOAuthState,
  readGoogleOAuthCookie,
} from '../../../../../../lib/google-oauth';

type GoogleTokenResponse = { access_token?: unknown; id_token?: unknown };
type GoogleIdentity = {
  aud?: unknown;
  email?: unknown;
  email_verified?: unknown;
  exp?: unknown;
  iss?: unknown;
};

export async function GET(request: Request) {
  const id = requestId(request.headers);
  try {
    const url = new URL(request.url);
    if (url.searchParams.get('error'))
      throw new AppError('AUTH_HANDOFF_INVALID', 'Google sign-in was canceled.', 401);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const sealed = openGoogleOAuthState(readGoogleOAuthCookie(request));
    if (!code || !state || state !== sealed.state)
      throw new AppError('AUTH_HANDOFF_INVALID', 'OAuth state validation failed.', 401);

    let google;
    try {
      google = loadGoogleAuthEnvironment();
    } catch {
      throw new AppError('BACKEND_UNAVAILABLE', 'Google sign-in is not configured.', 503);
    }
    const authorization = await prisma.extensionAuthorizationRequest.findUnique({
      where: { publicId: sealed.requestId },
    });
    const expectedStateHash = hashSecret(state, loadAuthEnvironment().SESSION_SECRET);
    if (
      !authorization ||
      authorization.status !== 'PENDING' ||
      authorization.expiresAt <= new Date() ||
      authorization.authorizationCodeHash !== expectedStateHash
    )
      throw new AppError('AUTH_HANDOFF_EXPIRED', 'OAuth handoff is invalid or expired.', 401);

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: google.GOOGLE_CLIENT_ID,
        client_secret: google.GOOGLE_CLIENT_SECRET,
        redirect_uri: google.GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
        code_verifier: sealed.verifier,
      }),
    });
    if (!tokenResponse.ok)
      throw new AppError('EXTERNAL_SERVICE_ERROR', 'Google token exchange failed.', 502);
    const tokens = (await tokenResponse.json()) as GoogleTokenResponse;
    if (typeof tokens.id_token !== 'string')
      throw new AppError('AUTH_HANDOFF_INVALID', 'Google identity token is missing.', 401);

    const identityResponse = await fetch(
      'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(tokens.id_token),
      { headers: { Accept: 'application/json' } },
    );
    if (!identityResponse.ok)
      throw new AppError('AUTH_HANDOFF_INVALID', 'Google identity could not be verified.', 401);
    const identity = (await identityResponse.json()) as GoogleIdentity;
    const verified =
      identity.aud === google.GOOGLE_CLIENT_ID &&
      identity.email_verified === 'true' &&
      typeof identity.email === 'string' &&
      Number(identity.exp) * 1_000 > Date.now() &&
      (identity.iss === 'accounts.google.com' || identity.iss === 'https://accounts.google.com');
    if (!verified)
      throw new AppError('AUTH_HANDOFF_INVALID', 'Google identity validation failed.', 401);

    const consumed = await prisma.extensionAuthorizationRequest.updateMany({
      where: {
        id: authorization.id,
        status: 'PENDING',
        authorizationCodeHash: expectedStateHash,
      },
      data: { authorizationCodeHash: null },
    });
    if (consumed.count !== 1)
      throw new AppError('AUTH_HANDOFF_INVALID', 'OAuth handoff was already used.', 409);

    const account = await findOrCreateGoogleAccount(identity.email as string);
    const session = await createWebSession(account.user.id, account.organizationId);
    await writeAudit({
      action: 'auth.google.login',
      resourceType: 'AuthSession',
      organizationId: account.organizationId,
      actorUserId: account.user.id,
    });
    const destination = new URL('/extension/connect', request.url);
    destination.searchParams.set('request', authorization.publicId);
    const headers = new Headers({
      Location: destination.toString(),
      'Cache-Control': 'no-store',
      'X-Request-Id': id,
    });
    headers.append('Set-Cookie', sessionCookie(session.token, session.expiresAt));
    headers.append('Set-Cookie', clearGoogleOAuthCookie());
    return new Response(null, { status: 302, headers });
  } catch (error) {
    const response = apiError(error, id);
    response.headers.append('Set-Cookie', clearGoogleOAuthCookie());
    return response;
  }
}
