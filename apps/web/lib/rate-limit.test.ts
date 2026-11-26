import { describe, expect, it, vi } from 'vitest';

vi.mock('@prospectai/database', () => ({ prisma: {} }));

import { requestIdentity } from './rate-limit';

const request = (headers: Record<string, string>) =>
  new Request('https://app.example.com/api/v1/auth/login', { headers });

describe('rate-limit client identity', () => {
  it('uses Vercel client address headers without TRUST_PROXY', () => {
    expect(
      requestIdentity(
        request({ 'x-vercel-forwarded-for': '203.0.113.9', 'x-forwarded-for': '198.51.100.1' }),
        { VERCEL: '1', NODE_ENV: 'production' },
      ),
    ).toBe('ip:203.0.113.9');
    expect(
      requestIdentity(request({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }), { VERCEL: '1' }),
    ).toBe('ip:203.0.113.7');
  });

  it('ignores spoofable forwarding headers when no trusted proxy is configured', () => {
    expect(requestIdentity(request({ 'x-forwarded-for': '203.0.113.7' }), {})).toBe(
      'direct-client',
    );
  });

  it('trusts forwarding headers when TRUST_PROXY is enabled', () => {
    expect(
      requestIdentity(request({ 'x-forwarded-for': '203.0.113.5' }), { TRUST_PROXY: 'true' }),
    ).toBe('ip:203.0.113.5');
  });
});
