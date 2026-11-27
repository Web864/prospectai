import { describe, expect, it, vi } from 'vitest';
import {
  answerVisitor,
  assistantRequestSchema,
  fallbackAnswer,
  rankKnowledge,
  type KnowledgeChunk,
} from './site-assistant';

const knowledge: KnowledgeChunk[] = [
  {
    id: 'plans',
    title: 'Plans and monthly analysis allowances',
    url: '/pricing',
    text: 'ProspectAI has three plans. Free: 10 website analyses a month, no credit card needed. Pro: 100 analyses a month.',
  },
  {
    id: 'score',
    title: 'How does the opportunity scoring work?',
    url: '/faq',
    text: 'How does the opportunity scoring work? The score combines observable website signals with commercial relevance.',
  },
  {
    id: 'extension',
    title: 'Chrome extension',
    url: '/features',
    text: 'The Chrome extension analyzes the website in your current tab.',
  },
];

const noProvider = { AI_PROVIDER: 'openai' } as unknown as NodeJS.ProcessEnv;
const withProvider = {
  AI_PROVIDER: 'openai',
  OPENAI_API_KEY: 'test-key',
  OPENAI_MODEL: 'test-model',
  OPENAI_BASE_URL: 'https://ai.example.test/v1',
} as unknown as NodeJS.ProcessEnv;

describe('rankKnowledge', () => {
  it('ranks the passage that answers the question first', () => {
    expect(rankKnowledge('Is there a free plan?', knowledge)[0]?.chunk.id).toBe('plans');
    expect(rankKnowledge('how is the score calculated', knowledge)[0]?.chunk.id).toBe('score');
  });

  it('returns nothing for questions with no overlap', () => {
    expect(rankKnowledge('weather in Paris tomorrow', knowledge)).toEqual([]);
  });
});

describe('answerVisitor without an AI provider', () => {
  it('quotes the best approved passage and links its source', async () => {
    const reply = await answerVisitor(
      { message: 'Do you have a free plan?' },
      { knowledge, environment: noProvider },
    );
    expect(reply.mode).toBe('extractive');
    expect(reply.answer).toContain('Free: 10 website analyses a month');
    expect(reply.sources[0]).toEqual({
      title: 'Plans and monthly analysis allowances',
      url: '/pricing',
    });
  });

  it('declines and points to contact when the site does not cover it', async () => {
    const reply = await answerVisitor(
      { message: 'Write me a poem about the ocean' },
      { knowledge, environment: noProvider },
    );
    expect(reply).toEqual({
      answer: fallbackAnswer,
      sources: [{ title: 'Contact', url: '/contact' }],
      mode: 'fallback',
    });
  });
});

describe('answerVisitor with an AI provider', () => {
  it('sends only retrieved sources with the grounding rules and maps cited sources', async () => {
    const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body.messages[0].content).toContain('Answer ONLY from the numbered SOURCES');
      expect(body.messages.at(-1).content).toContain('[1] Plans and monthly analysis allowances');
      expect(body.max_tokens).toBeLessThanOrEqual(400);
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: '{"answer":"Yes, the Free plan.","used":[1]}' } }],
        }),
      );
    });
    const reply = await answerVisitor(
      { message: 'Is there a free plan?' },
      { knowledge, environment: withProvider, fetcher: fetcher as unknown as typeof fetch },
    );
    expect(reply).toEqual({
      answer: 'Yes, the Free plan.',
      sources: [{ title: 'Plans and monthly analysis allowances', url: '/pricing' }],
      mode: 'ai',
    });
  });

  it('falls back to the approved passage when the provider fails', async () => {
    const fetcher = vi.fn(async () => new Response('busy', { status: 429 }));
    const reply = await answerVisitor(
      { message: 'Is there a free plan?' },
      { knowledge, environment: withProvider, fetcher: fetcher as unknown as typeof fetch },
    );
    expect(reply.mode).toBe('extractive');
  });
});

describe('assistantRequestSchema', () => {
  it('bounds message length and history size', () => {
    expect(assistantRequestSchema.safeParse({ message: 'x'.repeat(501) }).success).toBe(false);
    expect(
      assistantRequestSchema.safeParse({
        message: 'hello',
        history: Array.from({ length: 7 }, () => ({ role: 'user', content: 'hi' })),
      }).success,
    ).toBe(false);
  });
});
