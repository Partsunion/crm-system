import { authHeaders } from '../utils/storage';

export interface PhoneStatus {
  configured: boolean; connected: boolean; manager: boolean; reportingConnected?: boolean;
  trackingReady?: boolean; reconnectRequired?: boolean; number?: string; name?: string;
}
export interface CallLog {
  id: string; leadId: string | null; company: string; userId: string; userName: string;
  number: string; ownNumber: string | null; direction: 'inbound' | 'outbound'; state: string;
  recordingState: string | null; createdAt: string; answeredAt: string | null; endedAt: string | null;
  duration: number | null; note: string; noteVersion: number;
}
export class PhoneApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export async function phoneApi<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'https://api.partsunion.de'}/api/crm/phone${path}`, {
    method, credentials: 'include', cache: 'no-store', signal: AbortSignal.timeout(30000),
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new PhoneApiError(data?.error || 'Telefonie ist gerade nicht erreichbar.', response.status);
  return data as T;
}
export const callLabel = (state: string) => ({preparing:'Wird vorbereitet',connecting:'Wählt …',alerting:'Klingelt …',connected:'Im Gespräch',held:'Gehalten',remoteHeld:'Wird gehalten',completed:'Gespräch beendet',missed:'Nicht erreicht',failed:'Nicht gestartet',unconfirmed:'Abschluss nicht bestätigt'}[state] || state);
export function durationLabel(seconds: number) {
  return `${Math.floor(Math.max(0,seconds)/60)}:${String(Math.max(0,seconds)%60).padStart(2,'0')}`;
}
