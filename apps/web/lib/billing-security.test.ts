import { describe, expect, it } from 'vitest';
import { assertSameAppOrigin } from './billing-security';

describe('billing callback URL security', () => {
  it('accepts callback URLs on the configured application origin', () => {
    expect(
      assertSameAppOrigin(
        'https://app.example.test/app/billing?checkout=success',
        'https://app.example.test',
        'successUrl',
      ),
    ).toContain('/app/billing');
  });

  it.each([
    'https://attacker.example.test/steal',
    'javascript:alert(1)',
    'https://user:pass@app.example.test/app/billing',
  ])('rejects unsafe callback URL %s', (url) => {
    expect(() => assertSameAppOrigin(url, 'https://app.example.test', 'successUrl')).toThrowError(
      /application origin|valid URL/,
    );
  });
});
