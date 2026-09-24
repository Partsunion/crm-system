import type { Appointment } from './storage';

export type CalendarMode = 'month' | 'week' | 'day' | 'agenda';
export function calendarDays(cursor: Date, mode: CalendarMode): Date[] {
  const start = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
  if (mode === 'month') start.setDate(1);
  if (mode === 'month' || mode === 'week') start.setDate(start.getDate() - (start.getDay() + 6) % 7);
  const count = mode === 'month' ? 42 : mode === 'day' ? 1 : mode === 'agenda' ? 14 : 7;
  return Array.from({ length: count }, (_, index) => { const date = new Date(start); date.setDate(start.getDate() + index); return date; });
}
// Appointment storage currently uses Europe/Berlin floating wall time.
// Preserve those fields until the backend migrates existing appointments to zoned instants.
export function localAppointmentDay(iso: string): string { return iso.slice(0, 10); }
export function localAppointmentTime(iso: string): string { return iso.match(/T(\d{2}:\d{2})/)?.[1] || ''; }
export function overlappingAppointments(rows: Appointment[], start: string, durationMinutes: number, assigneeId?: string, excludeId?: string): Appointment[] {
  if (!assigneeId) return [];
  const from = Date.parse(start); const to = from + durationMinutes * 60_000;
  if (!Number.isFinite(from) || durationMinutes <= 0) return [];
  return rows.filter((a) => a.id !== excludeId && a.assignee_id === assigneeId && !['cancelled', 'declined', 'completed', 'no_show'].includes(a.status) && Date.parse(a.start_at) < to && Date.parse(a.end_at) > from);
}
