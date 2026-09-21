import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { loadAuthEnvironment, loadServerEnvironment } from '@prospectai/config';
import { AppError } from '@prospectai/shared';

const cookieName = 'prospectai_google_oauth';

export interface GoogleOAuthState {
  state: string;
  verifier: string;
  requestId: string;
  expiresAt: number;
}

function key() {
  return createHash('sha256').update(loadAuthEnvironment().SESSION_SECRET).digest();
}

export function sealGoogleOAuthState(value: GoogleOAuthState) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
}

export function openGoogleOAuthState(value: string | undefined) {
  if (!value) throw new AppError('AUTH_HANDOFF_INVALID', 'OAuth state is missing.', 401);
  try {
    const bytes = Buffer.from(value, 'base64url');
    const decipher = createDecipheriv('aes-256-gcm', key(), bytes.subarray(0, 12));
    decipher.setAuthTag(bytes.subarray(12, 28));
    const payload = JSON.parse(
      Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8'),
    ) as GoogleOAuthState;
    if (
      typeof payload.state !== 'string' ||
      typeof payload.verifier !== 'string' ||
      typeof payload.requestId !== 'string' ||
      typeof payload.expiresAt !== 'number' ||
      payload.expiresAt <= Date.now()
    )
      throw new Error('invalid state');
    return payload;
  } catch {
    throw new AppError('AUTH_HANDOFF_INVALID', 'OAuth state is invalid or expired.', 401);
  }
}

export function googleOAuthCookie(value: string) {
  const secure = loadServerEnvironment().NODE_ENV === 'production' ? '; Secure' : '';
  return (
    cookieName +
    '=' +
    value +
    '; Path=/api/v1/auth/google; HttpOnly; SameSite=Lax; Max-Age=600' +
    secure
  );
}

export function clearGoogleOAuthCookie() {
  return cookieName + '=; Path=/api/v1/auth/google; HttpOnly; SameSite=Lax; Max-Age=0';
}

export function readGoogleOAuthCookie(request: Request) {
  const prefix = cookieName + '=';
  return request.headers
    .get('cookie')
    ?.split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith(prefix))
    ?.slice(prefix.length);
}
