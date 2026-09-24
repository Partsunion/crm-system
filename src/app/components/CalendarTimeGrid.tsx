import type { Appointment } from '../utils/storage';
import { localAppointmentTime } from '../utils/calendar';
import { localDayKey } from '../utils/leadQuality';

const minutes = (iso: string) => { const [hour, minute] = localAppointmentTime(iso).split(':').map(Number); return (hour || 0) * 60 + (minute || 0); };
export function layoutDayAppointments(rows: Appointment[]) {
  const sorted = [...rows].sort((a, b) => a.start_at.localeCompare(b.start_at) || a.id.localeCompare(b.id));
  const groups: { end: number; lanes: number[]; items: { appointment: Appointment; start: number; end: number; lane: number }[] }[] = [];
  for (const appointment of sorted) {
    const start = minutes(appointment.start_at);
    const end = Math.min(1440, start + Math.max(5, appointment.duration_minutes || minutes(appointment.end_at) - start));
    let group = groups[groups.length - 1];
    if (!group || start >= group.end) { group = { end, lanes: [], items: [] }; groups.push(group); }
    let lane = group.lanes.findIndex((lastEnd) => lastEnd <= start);
    if (lane < 0) lane = group.lanes.length;
    group.lanes[lane] = end; group.end = Math.max(group.end, end);
    group.items.push({ appointment, start, end, lane });
  }
  return groups.flatMap((group) => group.items.map((item) => ({ ...item, lanes: group.lanes.length })));
}

export function CalendarTimeGrid({ days, byDay, today, onOpen, onCreate }: { days: Date[]; byDay: Record<string, Appointment[]>; today: string; onOpen: (appointment: Appointment) => void; onCreate: (day: string, time: string) => void }) {
  const data = days.map((day) => ({ day, key: localDayKey(day), rows: layoutDayAppointments((byDay[localDayKey(day)] || []).filter((item) => !['cancelled', 'declined'].includes(item.status))) }));
  const all = data.flatMap((day) => day.rows);
  const firstHour = Math.min(8, ...all.map((item) => Math.floor(item.start / 60)));
  const lastHour = Math.max(18, ...all.map((item) => Math.ceil(item.end / 60)));
  const hours = Array.from({ length: lastHour - firstHour }, (_, index) => firstHour + index);
  const height = hours.length * 56;
  return <>{days.length > 1 && <p className="border-b border-border-subtle bg-elevated/40 px-3 py-2 text-xs text-text-muted xl:hidden">Zeitraster horizontal verschieben, um weitere Tage zu sehen.</p>}<div className="max-h-[620px] overflow-auto" aria-label="Kalender mit Stundenraster" data-calendar-scroll><div style={{ minWidth: days.length > 1 ? 850 : 300 }}>
    <div className="sticky top-0 z-20 grid border-b border-border-subtle bg-surface" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))` }}><div className="px-2 py-3 text-xs text-text-muted">Berlin</div>{data.map(({ day, key }) => <div className={'border-l border-border-subtle px-2 py-3 text-center text-sm ' + (key === today ? 'font-semibold text-accent-500' : 'text-text-secondary')} key={key}>{day.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })}</div>)}</div>
    <div className="grid" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))` }}>
      <div className="relative" style={{ height }}>{hours.map((hour) => <span key={hour} className="absolute right-2 text-xs tabular-nums text-text-muted" style={{ top: (hour - firstHour) * 56 + 4 }}>{String(hour).padStart(2, '0')}:00</span>)}</div>
      {data.map(({ key, rows }) => <div key={key} className="relative border-l border-border-subtle" style={{ height }}>
        {hours.map((hour) => <button key={hour} type="button" aria-label={`Termin am ${key} um ${String(hour).padStart(2, '0')}:00 planen`} onClick={() => onCreate(key, `${String(hour).padStart(2, '0')}:00`)} className="absolute left-0 w-full border-t border-border-subtle/70 text-left hover:bg-elevated focus-visible:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-500" style={{ top: (hour - firstHour) * 56, height: 56 }} />)}
        {rows.map(({ appointment, start, end, lane, lanes }) => <button key={appointment.id} type="button" onClick={() => onOpen(appointment)} aria-label={`${localAppointmentTime(appointment.start_at)} ${appointment.customer_name || appointment.title}, ${appointment.assignee_name || 'nicht zugewiesen'}`} title={`${localAppointmentTime(appointment.start_at)}–${localAppointmentTime(appointment.end_at)} · ${appointment.customer_name || appointment.title} · ${appointment.assignee_name || ''}`} className="absolute z-10 overflow-hidden rounded border border-accent-500/35 border-l-[3px] bg-elevated px-1.5 py-1 text-left text-xs leading-tight text-text-primary hover:border-accent-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500" style={{ top: (start - firstHour * 60) / 60 * 56, height: Math.max(27, (end - start) / 60 * 56 - 2), left: `calc(${lane / lanes * 100}% + 2px)`, width: `calc(${100 / lanes}% - 4px)` }}><span className="font-medium tabular-nums">{localAppointmentTime(appointment.start_at)}</span><span className="ml-1 font-semibold">{appointment.customer_name || appointment.title}</span>{end - start >= 45 && <span className="mt-1 block truncate text-text-secondary">{appointment.assignee_name || 'Nicht zugewiesen'}</span>}</button>)}
      </div>)}
    </div>
  </div></div></>;
}
