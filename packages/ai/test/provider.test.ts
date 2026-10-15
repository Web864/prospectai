import { describe, expect, it } from 'vitest';
import { OpenAiProvider, analyzeBusiness } from '../src/index';

describe('OpenAI provider response contract', () => {
  it.each([
    [429, 'quota'],
    [401, 'authorization'],
    [503, 'provider'],
  ] as const)(
    'classifies HTTP %i without retrying the provider request',
    async (status, reason) => {
      let calls = 0;
      const provider = new OpenAiProvider(
        { apiKey: 'test-only', model: 'test-model', baseUrl: 'https://api.openai.com/v1' },
        async () => {
          calls++;
          return new Response(null, { status });
        },
      );
      await expect(
        provider.analyzeBusiness({
          domain: 'test.example',
          title: null,
          description: null,
          headings: [],
          boundedText: '',
        }),
      ).rejects.toMatchObject({
        code: 'AI_UNAVAILABLE',
        details: { reason, providerStatus: status },
      });
      expect(calls).toBe(1);
    },
  );
  it('classifies a provider timeout as a non-fatal AI timeout', async () => {
    const provider = new OpenAiProvider(
      { apiKey: 'test-only', model: 'test-model', baseUrl: 'https://api.openai.com/v1' },
      async () => {
        throw new DOMException('Timed out', 'TimeoutError');
      },
    );
    await expect(
      provider.analyzeBusiness({
        domain: 'test.example',
        title: null,
        description: null,
        headings: [],
        boundedText: '',
      }),
    ).rejects.toMatchObject({ details: { reason: 'timeout' } });
  });
  it.each([
    'https://api.openai.com/v1',
    'https://generativelanguage.googleapis.com/v1beta/openai/',
  ])('preserves the endpoint path and validates the response for %s', async (baseUrl) => {
    const provider = new OpenAiProvider(
      {
        apiKey: 'test-key',
        model: 'test-model',
        baseUrl,
      },
      async (url) => {
        expect(String(url)).toBe(`${baseUrl.replace(/\/$/, '')}/chat/completions`);
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    companyName: 'Example Company',
                    summary: 'A concise evidence-based business summary.',
                    confidence: 0.9,
                  }),
                },
              },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      },
    );

    const result = await analyzeBusiness(provider, {
      domain: 'example.com',
      title: 'Example Company',
      description: 'A business website.',
      headings: ['About'],
      boundedText: 'Evidence from the public page.',
    });

    expect(result).toEqual({
      companyName: 'Example Company',
      summary: 'A concise evidence-based business summary.',
      confidence: 0.9,
    });
  });
});
