import { afterEach, beforeEach, expect, it, vi } from 'vitest';
let idle: (() => void) | undefined;
let loaded: string[] = [];
beforeEach(() => {
  vi.resetModules(); loaded=[]; idle=undefined;
  vi.stubGlobal('requestIdleCallback', vi.fn(callback => {idle=callback; return 7;}));
  vi.stubGlobal('cancelIdleCallback', vi.fn());
  Object.defineProperty(navigator, 'connection', {configurable:true, get:()=>({saveData:false})});
  vi.doMock('../app/components/LeadsView', () => {loaded.push('leads'); return {};});
  vi.doMock('../app/components/KalenderView', () => {loaded.push('calendar'); return {};});
  vi.doMock('../app/components/ReportsView', () => {loaded.push('reports'); return {};});
});
afterEach(() => {vi.restoreAllMocks(); vi.unstubAllGlobals();});
it('waits for idle and only warms everyday workspaces automatically', async () => {
  const {ansichtenVorwaermen} = await import('../app/vorwaermen');
  const cancel = ansichtenVorwaermen();
  expect(loaded).toEqual([]);
  idle!(); await vi.dynamicImportSettled();
  expect(loaded.sort()).toEqual(['calendar','leads']);
  cancel(); expect(cancelIdleCallback).toHaveBeenCalledWith(7);
});
it('loads reports on user intent and safely ignores unknown views', async () => {
  const {ansichtVorwaermen} = await import('../app/vorwaermen');
  ansichtVorwaermen('reports'); ansichtVorwaermen('unknown');
  await vi.dynamicImportSettled();
  expect(loaded).toEqual(['reports']);
});
it('respects data saving connections', async () => {
  Object.defineProperty(navigator, 'connection', {configurable:true, get:()=>({saveData:true})});
  const {ansichtenVorwaermen} = await import('../app/vorwaermen');
  ansichtenVorwaermen();
  expect(requestIdleCallback).not.toHaveBeenCalled(); expect(loaded).toEqual([]);
});
it('cancels pending fallback work when leaving the workspace', async () => {
  vi.useFakeTimers(); vi.stubGlobal('requestIdleCallback', undefined);
  const {ansichtenVorwaermen} = await import('../app/vorwaermen');
  ansichtenVorwaermen()(); vi.runAllTimers(); await vi.dynamicImportSettled();
  expect(loaded).toEqual([]); vi.useRealTimers();
});
