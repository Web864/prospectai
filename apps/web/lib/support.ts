/** Public support address shown on contact and legal pages. Configure SUPPORT_EMAIL in production. */
export function supportEmail(): string | null {
  const value = process.env.SUPPORT_EMAIL?.trim();
  return value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null;
}
