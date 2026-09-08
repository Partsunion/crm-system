import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useResultPage } from './useResultPage';
afterEach(cleanup);
const items = Array.from({ length: 72 }, (_, i) => i);
describe('Result pages', () => {
  it('limits rendered results and resets immediately when the filter or sort changes', () => {
    const { result, rerender } = renderHook(({ scope }) => useResultPage(items, scope), { initialProps: { scope: 'all' } });
    expect(result.current.rows).toHaveLength(25);
    act(() => result.current.setPage(3));
    expect(result.current.rows).toHaveLength(22);
    expect(result.current.start).toBe(50);
    rerender({ scope: 'search:nord' });
    expect(result.current.page).toBe(1);
    expect(result.current.rows[0]).toBe(0);
    rerender({ scope: 'all' });
    expect(result.current.page).toBe(1);
  });
  it('clamps the page when results disappear and handles zero results', () => {
    const { result, rerender } = renderHook(({ rows }) => useResultPage(rows, 'all'), { initialProps: { rows: items } });
    act(() => result.current.setPage(3));
    rerender({ rows: items.slice(0, 30) });
    expect(result.current.page).toBe(2);
    expect(result.current.rows).toHaveLength(5);
    rerender({ rows: [] });
    expect(result.current).toMatchObject({ page: 1, pages: 1, start: 0, end: 0, rows: [] });
  });
  it('supports bounded page sizes and prevents unsupported sizes', () => {
    const { result } = renderHook(() => useResultPage(items, 'all'));
    act(() => result.current.setPage(3));
    act(() => result.current.setSize(50));
    expect(result.current.page).toBe(1);
    expect(result.current.rows).toHaveLength(50);
    act(() => result.current.setSize(1000));
    expect(result.current.size).toBe(50);
  });
  it('restores the current page after a remount without losing it during loading', () => {
    sessionStorage.clear();
    const first = renderHook(() => useResultPage(items, 'mine', {remember:'test'}));
    act(() => first.result.current.setPage(3));
    first.unmount();
    const next = renderHook(({loading}) => useResultPage(loading ? [] : items, 'mine', {remember:'test', loading}), {initialProps:{loading:true}});
    next.rerender({loading:false});
    expect(next.result.current.page).toBe(3);
    expect(next.result.current.rows[0]).toBe(50);
  });
});
