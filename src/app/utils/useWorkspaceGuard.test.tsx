import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { mayLeaveWorkspace, useWorkspaceGuard } from './useWorkspaceGuard';
function Form({ dirty, busy = false }: { dirty: boolean; busy?: boolean }) { useWorkspaceGuard(dirty, busy); return null; }
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
it('keeps dirty input on cancelled navigation and removes the guard after saving', () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  const view = render(<Form dirty />);
  expect(mayLeaveWorkspace()).toBe(false); expect(confirm).toHaveBeenCalledOnce();
  const unload = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(unload); expect(unload.defaultPrevented).toBe(true);
  view.rerender(<Form dirty={false} />);
  expect(mayLeaveWorkspace()).toBe(true);
});
it('allows an explicitly confirmed discard but never discards a running write', () => {
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  const view = render(<Form dirty />); expect(mayLeaveWorkspace()).toBe(true);
  view.rerender(<Form dirty busy />); expect(mayLeaveWorkspace()).toBe(false);
});
