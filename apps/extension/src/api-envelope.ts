/** Reads the `{ error: { code, details } }` envelope that every ProspectAI API error uses. */
export async function readApiError(
  response: Response,
): Promise<{ code?: string; details: Record<string, unknown> }> {
  try {
    const body: unknown = await response.json();
    const error =
      body && typeof body === 'object' && 'error' in body
        ? (body as { error: unknown }).error
        : null;
    if (!error || typeof error !== 'object') return { details: {} };
    const { code, details } = error as { code?: unknown; details?: unknown };
    return {
      ...(typeof code === 'string' ? { code } : {}),
      details: details && typeof details === 'object' ? (details as Record<string, unknown>) : {},
    };
  } catch {
    return { details: {} };
  }
}

/** Builds links into the ProspectAI web app from server identifiers only (never page input). */
export function appLink(appUrl: string, path: string, id?: string) {
  return `${appUrl}${path}${id === undefined ? '' : encodeURIComponent(id)}`;
}
