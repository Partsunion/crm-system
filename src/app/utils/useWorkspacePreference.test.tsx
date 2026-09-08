import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useWorkspacePreference, workspaceKey } from './useWorkspacePreference';
const user = vi.hoisted(() => ({id:'aaron'}));
vi.mock('./storage', () => ({getCurrentUser: () => user}));
beforeEach(() => { sessionStorage.clear(); user.id='aaron'; });
afterEach(cleanup);
it('remembers the working filter and keeps it separate for each user', () => {
  const first = renderHook(() => useWorkspacePreference<string>('filter','all'));
  act(() => first.result.current[1]('mine'));
  first.unmount();
  const restored = renderHook(() => useWorkspacePreference('filter','all'));
  expect(restored.result.current[0]).toBe('mine');
  restored.unmount(); user.id='elias';
  expect(renderHook(() => useWorkspacePreference('filter','all')).result.current[0]).toBe('all');
});
it.each(['{broken', '5', '"removed-view"'])('ignores damaged or unsupported stored preferences: %s', stored => {
  sessionStorage.setItem(workspaceKey('view'),stored);
  expect(renderHook(() => useWorkspacePreference('view','table',['table','board'])).result.current[0]).toBe('table');
});
