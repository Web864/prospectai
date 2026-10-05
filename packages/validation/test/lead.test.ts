import { describe, expect, it } from 'vitest';
import { leadCreateSchema } from '../src/index';

describe('lead validation', () => {
  it('rejects contacts without any identifying field', () => {
    expect(leadCreateSchema.safeParse({ contacts: [{}] }).success).toBe(false);
  });

  it('accepts a contact with at least one identifying field', () => {
    expect(leadCreateSchema.safeParse({ contacts: [{ email: 'lead@example.com' }] }).success).toBe(
      true,
    );
  });
});
