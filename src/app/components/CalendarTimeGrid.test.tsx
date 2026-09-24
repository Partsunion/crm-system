import { expect, it } from 'vitest';
import { layoutDayAppointments } from './CalendarTimeGrid';
import type { Appointment } from '../utils/storage';
const row = (id: string, time: string, duration: number) => ({ id, start_at: '2026-09-04T' + time, duration_minutes: duration } as Appointment);
it('uses consistent lanes across a transitive overlap group', () => {
  const result = layoutDayAppointments([row('a', '09:00', 60), row('b', '09:30', 90), row('c', '10:00', 30), row('d', '10:15', 45)]);
  expect(result.map((entry) => entry.lanes)).toEqual([3, 3, 3, 3]);
  expect(result.map((entry) => entry.lane)).toEqual([0, 1, 0, 2]);
});
it('reuses a full-width lane after appointments no longer overlap', () => {
  const result = layoutDayAppointments([row('a', '09:00', 30), row('b', '09:30', 30)]);
  expect(result.map((entry) => entry.lanes)).toEqual([1, 1]);
});
