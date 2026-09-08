import { randomUUID } from 'node:crypto';
import { AppError, errorEnvelope } from '@prospectai/shared';
import { ZodError, type ZodType } from 'zod';

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
  return Response.json(
    errorEnvelope(new AppError('INTERNAL_ERROR', 'An unexpected error occurred.', 500), id),
    { status: 500, headers: { 'X-Request-Id': id } },
  );
}
export async function parseJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  return schema.parse(await request.json());
}
