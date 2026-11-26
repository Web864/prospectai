import { AppError } from '@prospectai/shared';

/**
 * The approval page sends the authorization code to `redirectUri`. Any extension can own a
 * `<id>.chromiumapp.org` redirect, so production pins the published extension ID(s) with
 * EXTENSION_ALLOWED_IDS (comma separated) and only those may receive codes.
 */
export function assertAllowedExtensionRedirect(
  redirectUri: string,
  allowed = process.env.EXTENSION_ALLOWED_IDS,
) {
  const ids = (allowed ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  if (ids.length === 0) return;
  const hostname = new URL(redirectUri).hostname.toLowerCase();
  if (!ids.some((id) => hostname === `${id}.chromiumapp.org`))
    throw new AppError('FORBIDDEN', 'This extension is not authorized to connect.', 403);
}
