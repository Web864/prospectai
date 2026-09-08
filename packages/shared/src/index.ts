import { randomUUID } from 'node:crypto';

export const errorCodes = [
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'VALIDATION_ERROR',
  'CONFLICT',
  'RATE_LIMITED',
  'USAGE_LIMIT_REACHED',
  'ANALYSIS_UNAVAILABLE',
  'EXTERNAL_SERVICE_ERROR',
  'INTERNAL_ERROR',
] as const;
export type ErrorCode = (typeof errorCodes)[number];

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly status: number,
    public readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorEnvelope(error: AppError, requestId: string = randomUUID()) {
  return { error: { code: error.code, message: error.message, requestId, details: error.details } };
}

export interface Logger {
  info(event: string, fields?: Record<string, unknown>): void;
  warn(event: string, fields?: Record<string, unknown>): void;
  error(event: string, fields?: Record<string, unknown>): void;
}

const redact = (fields: Record<string, unknown> = {}) =>
  Object.fromEntries(
    Object.entries(fields).map(([key, value]) =>
      /token|secret|password|authorization|cookie|api.?key/i.test(key)
        ? [key, '[REDACTED]']
        : [key, value],
    ),
  );

export function createLogger(service: string): Logger {
  const write = (level: string, event: string, fields?: Record<string, unknown>) =>
    console.log(
      JSON.stringify({
        level,
        event,
        service,
        timestamp: new Date().toISOString(),
        ...redact(fields),
      }),
    );
  return {
    info: (event, fields) => write('info', event, fields),
    warn: (event, fields) => write('warn', event, fields),
    error: (event, fields) => write('error', event, fields),
  };
}
