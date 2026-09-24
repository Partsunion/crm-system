import { useEffect, useState } from 'react';
import { getAppointments, type Appointment } from './storage';
import { overlappingAppointments } from './calendar';

export function useAppointmentConflicts(enabled: boolean, start: string, duration: number, assigneeId?: string, excludeId?: string) {
  const key = enabled && assigneeId && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(start) ? [start, duration, assigneeId, excludeId].join('|') : '';
  const [snapshot, setSnapshot] = useState<{ key: string; rows: Appointment[]; error: boolean; pending: boolean }>({ key: '', rows: [], error: false, pending: false });
  const [acknowledged, setAcknowledged] = useState('');
  const [tick, setTick] = useState(0);
  const rows = snapshot.key === key ? snapshot.rows : [];
  const conflicts = overlappingAppointments(rows, start, duration, assigneeId, excludeId);
  const signature = key + ':' + conflicts.map((row) => [row.id, row.start_at, row.end_at].join('/')).sort().join(',');
  const confirmed = acknowledged === signature;
  const fetchRows = () => getAppointments({ from: start.slice(0, 10) + 'T00:00', to: start.slice(0, 10) + 'T23:59', assigneeId }, true);
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    setSnapshot({ key, rows: [], error: false, pending: true }); setAcknowledged('');
    fetchRows().then((data) => { if (!cancelled) setSnapshot({ key, rows: data, error: false, pending: false }); })
      .catch(() => { if (!cancelled) setSnapshot({ key, rows: [], error: true, pending: false }); });
    return () => { cancelled = true; };
    // key includes all request inputs. tick is an explicit retry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick]);
  const loading = Boolean(key) && (snapshot.key !== key || snapshot.pending);
  const error = Boolean(key) && snapshot.key === key && snapshot.error;
  async function verify(): Promise<boolean> {
    if (!key) return true;
    try {
      const fresh = await fetchRows();
      const collisions = overlappingAppointments(fresh, start, duration, assigneeId, excludeId);
      const current = key + ':' + collisions.map((row) => [row.id, row.start_at, row.end_at].join('/')).sort().join(',');
      setSnapshot({ key, rows: fresh, error: false, pending: false });
      return collisions.length === 0 || acknowledged === current;
    } catch { setSnapshot({ key, rows, error: true, pending: false }); return false; }
  }
  return { conflicts, loading, error, confirmed, setConfirmed: (value: boolean) => setAcknowledged(value ? signature : ''), retry: () => setTick((value) => value + 1), verify };
}
export type AppointmentConflictState = ReturnType<typeof useAppointmentConflicts>;
