export type BatchOutcome<T> = { item: T; ok: true } | { item: T; ok: false; error: string };

/** Wait for every request before reconciling. Never retry writes automatically. */
export async function runBatch<T>(
  items: readonly T[],
  perform: (item: T) => Promise<void>,
  onProgress: (completed: number, total: number) => void = () => undefined,
  concurrency = 3,
): Promise<BatchOutcome<T>[]> {
  const outcomes: BatchOutcome<T>[] = new Array(items.length);
  let next = 0;
  let completed = 0;
  const workers = Math.min(items.length, Math.max(1, Math.min(5, Math.floor(concurrency) || 1)));
  await Promise.all(Array.from({ length: workers }, async () => {
    while (next < items.length) {
      const index = next++;
      const item = items[index];
      try {
        await perform(item);
        outcomes[index] = { item, ok: true };
      } catch (error) {
        outcomes[index] = { item, ok: false, error: error instanceof Error ? error.message : 'Die Änderung wurde nicht bestätigt.' };
      }
      onProgress(++completed, items.length);
    }
  }));
  return outcomes;
}
