import { describe, expect, it } from 'vitest';
import { calendarDays, localAppointmentTime, overlappingAppointments } from './calendar';
import type { Appointment } from './storage';

const appointment = { id: 'a', assignee_id: 'seller', start_at: '2026-09-04T10:00', end_at: '2026-09-04T10:30', status: 'confirmed' } as Appointment;
describe('calendar periods and collision preview', () => {
  it('starts weeks on Monday and provides exact day/week/agenda periods', () => {
    const day = new Date(2026, 8, 4);
    expect(calendarDays(day, 'week')).toHaveLength(7);
    expect(calendarDays(day, 'week')[0].getDay()).toBe(1);
    expect(calendarDays(day, 'day')).toHaveLength(1);
    expect(calendarDays(day, 'agenda')).toHaveLength(14);
    expect(calendarDays(day, 'month')).toHaveLength(42);
  });
  it('detects overlap only for the same assignee and active appointments', () => {
    expect(overlappingAppointments([appointment], '2026-09-04T10:15', 30, 'seller')).toHaveLength(1);
    expect(overlappingAppointments([appointment], '2026-09-04T10:30', 30, 'seller')).toHaveLength(0);
    expect(overlappingAppointments([appointment], '2026-09-04T10:15', 30, 'other')).toHaveLength(0);
    expect(overlappingAppointments([{ ...appointment, status: 'cancelled' }], '2026-09-04T10:15', 30, 'seller')).toHaveLength(0);
    expect(overlappingAppointments([appointment], '2026-09-04T10:15', 30, 'seller', 'a')).toHaveLength(0);
  });
  it('preserves the backend Berlin wall time until zoned storage is migrated', () => {
    expect(localAppointmentTime('2026-09-04T10:15')).toBe('10:15');
  });
});
