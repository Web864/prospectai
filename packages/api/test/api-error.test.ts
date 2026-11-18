import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { AppError } from '@prospectai/shared';
import { apiError, parseJson } from '../src/index';

const logged = () => vi.spyOn(console, 'log').mockImplementation(() => undefined);

afterEach(() => vi.restoreAllMocks());

describe('apiError', () => {
  it('passes AppError through with its status and request id', async () => {
    const response = apiError(new AppError('NOT_FOUND', 'Missing.', 404), 'req-1');
    expect(response.status).toBe(404);
    expect(response.headers.get('X-Request-Id')).toBe('req-1');
    expect((await response.json()).error.code).toBe('NOT_FOUND');
  });

  it('maps validation failures to 400', async () => {
    const result = z.object({ a: z.string() }).safeParse({});
    if (result.success) throw new Error('expected failure');
    const response = apiError(result.error, 'req-2');
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('VALIDATION_ERROR');
  });

  it('logs unexpected errors with the request id, without leaking details to the client', async () => {
    const spy = logged();
    const response = apiError(new Error('boom secret detail'), 'req-3');
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(body)).not.toContain('boom');
    const entry = JSON.parse(String(spy.mock.calls[0]?.[0]));
    expect(entry).toMatchObject({
      level: 'error',
      event: 'api.unhandled_error',
      requestId: 'req-3',
      errorName: 'Error',
    });
  });

  it.each(['P2034', 'P2024', 'P1001', 'P1002', 'P1008', 'P1017'])(
    'maps transient database error %s to a retryable 503',
    async (code) => {
      logged();
      const response = apiError(Object.assign(new Error('db'), { code }), 'req-4');
      expect(response.status).toBe(503);
      expect(response.headers.get('Retry-After')).toBe('1');
      const body = await response.json();
      expect(body.error.code).toBe('BACKEND_UNAVAILABLE');
      expect(body.error.details.retryable).toBe(true);
    },
  );

  it('keeps non-transient database errors as 500', () => {
    logged();
    expect(apiError(Object.assign(new Error('unique'), { code: 'P2002' }), 'req-5').status).toBe(
      500,
    );
  });
});

describe('parseJson', () => {
  const schema = z.object({ name: z.string() });
  const post = (body: string) => new Request('http://x.test/', { method: 'POST', body });

  it('parses a valid body', async () => {
    await expect(parseJson(post('{"name":"a"}'), schema)).resolves.toEqual({ name: 'a' });
  });

  it.each(['', '{not json', 'null garbage'])(
    'rejects unreadable body %j with a 400, not a 500',
    async (body) => {
      const error = await parseJson(post(body), schema).catch((caught: unknown) => caught);
      expect(error).toBeInstanceOf(AppError);
      expect(apiError(error, 'req-6').status).toBe(400);
    },
  );

  it('still rejects schema violations', async () => {
    await expect(parseJson(post('{"name":1}'), schema)).rejects.toThrow();
  });
});
