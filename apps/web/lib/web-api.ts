export type ApiFailureKind =
  | 'unauthorized'
  | 'forbidden'
  | 'rate_limited'
  | 'quota_exceeded'
  | 'not_found'
  | 'backend_unavailable'
  | 'invalid_response'
  | 'request_failed';

export class ApiClientError extends Error {
  constructor(
    public readonly kind: ApiFailureKind,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

function failureKind(status: number, code?: string): ApiFailureKind {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 429 && (code === 'USAGE_LIMIT_REACHED' || code === 'GUEST_TRIAL_EXHAUSTED'))
    return 'quota_exceeded';
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'backend_unavailable';
  return 'request_failed';
}

export async function webApiRequest<T>(
  path: string,
  schema: { parse(value: unknown): T },
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set('Content-Type', 'application/json');
  const timeout = AbortSignal.timeout(20_000);
  const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      ...init,
      credentials: 'same-origin',
      headers,
      signal,
    });
  } catch {
    throw new ApiClientError('backend_unavailable', 'ProspectAI could not be reached.');
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: { code?: string; message?: string };
    } | null;
    throw new ApiClientError(
      failureKind(response.status, payload?.error?.code),
      payload?.error?.message ?? 'The request could not be completed.',
      response.status,
    );
  }

  try {
    return schema.parse(await response.json());
  } catch {
    throw new ApiClientError('invalid_response', 'The server returned an invalid response.');
  }
}
