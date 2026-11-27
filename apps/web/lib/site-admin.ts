import { hashSecret } from '@prospectai/auth';
import { loadAuthEnvironment } from '@prospectai/config';
import { prisma } from '@prospectai/database';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * Site administration (blog, landing pages, FAQ) is separate from customer workspaces.
 *
 * Access needs all three: a signed-in ProspectAI session (so the existing hashed passwords,
 * rate limits and Google sign-in apply), a verified email address, and that email listed in
 * SITE_ADMIN_EMAILS. Verification matters: otherwise anyone could register an allowlisted
 * address before its owner does. With SITE_ADMIN_EMAILS unset, nobody can reach /admin.
 */
export function siteAdminEmails(environment: Record<string, string | undefined> = process.env) {
  return new Set(
    (environment.SITE_ADMIN_EMAILS ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isSiteAdmin(
  user: { email: string; emailVerifiedAt: Date | null } | null | undefined,
  environment: Record<string, string | undefined> = process.env,
) {
  return Boolean(
    user?.emailVerifiedAt && siteAdminEmails(environment).has(user.email.toLowerCase()),
  );
}

export interface SiteAdmin {
  userId: string;
  email: string;
}

export async function currentSiteAdmin(): Promise<SiteAdmin | null> {
  const token = (await cookies()).get('prospectai_session')?.value;
  if (!token) return null;
  const session = await prisma.authSession.findUnique({
    where: { tokenHash: hashSecret(token, loadAuthEnvironment().SESSION_SECRET) },
    select: {
      expiresAt: true,
      revokedAt: true,
      user: { select: { id: true, email: true, emailVerifiedAt: true } },
    },
  });
  if (!session || session.revokedAt || session.expiresAt <= new Date()) return null;
  return isSiteAdmin(session.user) ? { userId: session.user.id, email: session.user.email } : null;
}

/** For admin pages: sends signed-out visitors to log in and everyone else to a 404. */
export async function requireSiteAdmin(): Promise<SiteAdmin> {
  const token = (await cookies()).get('prospectai_session')?.value;
  if (!token) redirect('/login?returnTo=/admin');
  const admin = await currentSiteAdmin();
  if (!admin) redirect('/admin/denied');
  return admin;
}
