import type { AppointmentConflictState } from '../utils/useAppointmentConflicts';
import { localAppointmentTime } from '../utils/calendar';

export function AppointmentConflictReview({ review }: { review: AppointmentConflictState }) {
  return <div className="space-y-2 text-sm">
    {review.loading && <p role="status" className="text-text-muted">Verfügbarkeit im CRM wird geprüft…</p>}
    {review.error && <p role="alert" className="text-status-danger">Verfügbarkeit nicht prüfbar. <button type="button" className="underline" onClick={review.retry}>Erneut versuchen</button></p>}
    {review.conflicts.length > 0 && <div className="rounded-md border border-status-warning/40 bg-status-warning/10 p-3"><p className="font-medium">Terminüberschneidung im CRM-Kalender</p>{review.conflicts.map((item) => <p key={item.id} className="mt-1 text-text-secondary">{localAppointmentTime(item.start_at)}–{localAppointmentTime(item.end_at)} · {item.customer_name || item.title}</p>)}<label className="mt-3 flex items-start gap-2"><input type="checkbox" checked={review.confirmed} onChange={(event) => review.setConfirmed(event.target.checked)} />Überschneidung geprüft, trotzdem speichern</label></div>}
  </div>;
}
