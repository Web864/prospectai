import { randomUUID } from 'node:crypto';
import { AppError, createLogger, errorEnvelope } from '@prospectai/shared';
import { ZodError, type ZodType } from 'zod';

const logger = createLogger('api');

/**
 * Prisma codes for failures that are expected to clear on retry: transaction conflicts or
 * deadlocks (P2034), connection pool timeouts (P2024) and database connectivity (P1001,
 * P1002, P1008, P1017). Matched by code so this package stays independent of the ORM.
 */
const transientDatabaseCodes = new Set(['P2034', 'P2024', 'P1001', 'P1002', 'P1008', 'P1017']);

function transientDatabaseCode(error: unknown) {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === 'string' && transientDatabaseCodes.has(code) ? code : undefined;
}

export function requestId(headers: Headers) {
  return headers.get('x-request-id') ?? randomUUID();
}
export function apiError(error: unknown, id: string): Response {
  if (error instanceof AppError)
    return Response.json(errorEnvelope(error, id), {
      status: error.status,
      headers: { 'X-Request-Id': id },
    });
  if (error instanceof ZodError)
    return Response.json(
      errorEnvelope(
        new AppError('VALIDATION_ERROR', 'The request is invalid.', 400, {
          issues: error.flatten(),
        }),
        id,
      ),
      { status: 400, headers: { 'X-Request-Id': id } },
    );
  const databaseCode = transientDatabaseCode(error);
  logger.error('api.unhandled_error', {
    requestId: id,
    errorName: error instanceof Error ? error.name : typeof error,
    errorMessage:
      error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500),
    databaseCode,
    stack: error instanceof Error ? error.stack?.split('\n').slice(0, 8).join('\n') : undefined,
  });
  if (databaseCode)
    return Response.json(
      errorEnvelope(
        new AppError('BACKEND_UNAVAILABLE', 'The service is busy. Please retry shortly.', 503, {
          retryable: true,
        }),
        id,
      ),
      { status: 503, headers: { 'X-Request-Id': id, 'Retry-After': '1' } },
    );
  return Response.json(
    errorEnvelope(new AppError('INTERNAL_ERROR', 'An unexpected error occurred.', 500), id),
    { status: 500, headers: { 'X-Request-Id': id } },
  );
}
export async function parseJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    // Unreadable or non-JSON bodies are a client error, not a server fault.
    throw new AppError('VALIDATION_ERROR', 'The request body must be valid JSON.', 400);
  }
  return schema.parse(body);
}
