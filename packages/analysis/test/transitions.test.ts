import { describe, expect, it } from 'vitest';
import { AppError } from '@prospectai/shared';
import { assertJobTransition } from '../src/index.js';

describe('analysis job transitions', () => {
  it('allows the canonical processing path', () =>
    expect(() => assertJobTransition('queued', 'validating')).not.toThrow());
  it('rejects terminal job transitions', () =>
    expect(() => assertJobTransition('completed', 'fetching')).toThrow(AppError));
});
