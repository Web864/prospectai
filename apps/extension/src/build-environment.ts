export function extensionEnvironment(
  mode: string,
  environment: { VITE_APP_URL?: string; VITE_API_BASE_URL?: string },
) {
  const local = mode === 'development' || mode === 'local-development' || mode === 'test';
  const appUrl = environment.VITE_APP_URL || (local ? 'http://localhost:3000' : '');
  const apiUrl = environment.VITE_API_BASE_URL || (local ? `${appUrl}/api/v1` : '');
  if (!appUrl || !apiUrl) throw new Error('Extension app and API URLs are required.');
  for (const value of [appUrl, apiUrl]) {
    const url = new URL(value);
    const loopback =
      url.hostname === 'localhost' ||
      url.hostname.endsWith('.localhost') ||
      /^127\./.test(url.hostname) ||
      ['[::1]', '0.0.0.0'].includes(url.hostname);
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (!local && (url.protocol !== 'https:' || loopback)) ||
      !['http:', 'https:'].includes(url.protocol)
    )
      throw new Error(
        'Production extension URLs must use non-local HTTPS origins without credentials.',
      );
  }
  return { appUrl: appUrl.replace(/\/$/, ''), apiUrl: apiUrl.replace(/\/$/, '') };
}
