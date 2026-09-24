import { describe, expect, it, vi } from 'vitest';
import { runBatch } from './batchWork';

describe('bounded batch operations', () => {
  it('waits for all requests, keeps ordering and reports partial failures', async () => {
    const progress = vi.fn();
    const results = await runBatch(['a', 'b', 'c'], async (id) => { if (id === 'b') throw new Error('Permission denied'); }, progress);
    expect(results).toEqual([{ item: 'a', ok: true }, { item: 'b', ok: false, error: 'Permission denied' }, { item: 'c', ok: true }]);
    expect(progress).toHaveBeenLastCalledWith(3, 3);
  });
  it('bounds concurrency without retrying failed writes', async () => {
    let active = 0; let maximum = 0;
    const calls: number[] = [];
    const results = await runBatch([1, 2, 3, 4, 5], async (id) => {
      calls.push(id); active++; maximum = Math.max(maximum, active);
      await new Promise((resolve) => setTimeout(resolve, 1)); active--;
      if (id === 2) throw new Error('Offline');
    }, undefined, 2);
    expect(maximum).toBe(2); expect(calls).toEqual([1, 2, 3, 4, 5]);
    expect(results.filter((item) => !item.ok)).toHaveLength(1);
  });
  it('handles an empty selection without issuing work', async () => {
    const perform = vi.fn(); expect(await runBatch([], perform)).toEqual([]); expect(perform).not.toHaveBeenCalled();
  });
});
