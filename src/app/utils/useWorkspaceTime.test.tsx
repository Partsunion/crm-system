import { act, renderHook, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useWorkspaceTime } from './useWorkspaceTime';
import { localDayKey } from './leadQuality';

afterEach(() => { cleanup(); vi.useRealTimers(); });
it('updates the working day across midnight and clears the timer on exit', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 8, 5, 23, 59, 30));
  const { result, unmount } = renderHook(() => useWorkspaceTime());
  expect(localDayKey(new Date(result.current))).toBe('2026-09-05');
  act(() => vi.advanceTimersByTime(60_000));
  expect(localDayKey(new Date(result.current))).toBe('2026-09-06');
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});
it('refreshes when returning to a suspended browser tab', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 8, 5, 9));
  const { result } = renderHook(() => useWorkspaceTime());
  const later = new Date(2026, 8, 6, 10).getTime();
  vi.setSystemTime(later);
  act(() => window.dispatchEvent(new Event('focus')));
  expect(result.current).toBe(later);
});
