import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
const request = vi.hoisted(() => vi.fn());
vi.mock('../lib/web-api', async (original) => ({
  ...(await original<object>()),
  webApiRequest: request,
}));
import { useJobProgress } from './analysis-detail-view';
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});
describe('truthful job polling', () => {
  it('keeps polling a healthy job beyond the old 120-response cutoff', async () => {
    vi.useFakeTimers();
    request.mockResolvedValue({
      data: { id: 'job', status: 'ai_processing', progress: 75, attempt: 1 },
    });
    const { result } = renderHook(() => useJobProgress('job'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(183_000);
    });
    expect(request.mock.calls.length).toBeGreaterThan(120);
    expect(result.current.status).toBe('success');
    request.mockResolvedValue({
      data: { id: 'job', status: 'partial', progress: 100, attempt: 1 },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    const count = request.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });
    expect(request.mock.calls).toHaveLength(count);
    expect(result.current).toMatchObject({ data: { data: { status: 'partial' } } });
  });
});
