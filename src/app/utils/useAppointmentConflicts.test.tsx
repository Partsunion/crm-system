import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useAppointmentConflicts } from './useAppointmentConflicts';
import { getAppointments, type Appointment } from './storage';
vi.mock('./storage', () => ({ getAppointments: vi.fn() }));
const collision = { id: 'slot-1', start_at: '2026-09-04T10:00', end_at: '2026-09-04T10:30', assignee_id: 'seller', status: 'confirmed' } as Appointment;
beforeEach(() => { vi.mocked(getAppointments).mockReset(); });
afterEach(cleanup);
it('rechecks fresh availability and blocks newly arrived conflicts before save', async () => {
  vi.mocked(getAppointments).mockResolvedValueOnce([]).mockResolvedValue([collision]);
  const { result } = renderHook(() => useAppointmentConflicts(true, '2026-09-04T10:15', 30, 'seller'));
  await waitFor(() => expect(result.current.loading).toBe(false));
  let allowed = true; await act(async () => { allowed = await result.current.verify(); });
  expect(allowed).toBe(false); expect(result.current.conflicts).toHaveLength(1);
  act(() => result.current.setConfirmed(true));
  await act(async () => { allowed = await result.current.verify(); }); expect(allowed).toBe(true);
  expect(getAppointments).toHaveBeenLastCalledWith(expect.objectContaining({ assigneeId: 'seller' }), true);
});
it('fails closed on network errors and allows explicit retry', async () => {
  vi.mocked(getAppointments).mockRejectedValueOnce(new Error('offline')).mockResolvedValue([]);
  const { result } = renderHook(() => useAppointmentConflicts(true, '2026-09-04T10:15', 30, 'seller'));
  await waitFor(() => expect(result.current.error).toBe(true));
  act(() => result.current.retry()); await waitFor(() => expect(result.current.error).toBe(false));
});
