import { authHeaders } from '../utils/storage';

export function oauthErrorMessage(reason:string|null):string {
  const messages:Record<string,string>={
    callback:'Die Webex-Rückmeldung war unvollständig. Bitte die Telefonie in diesem CRM-Tab erneut verbinden.',
    state:'Die Webex-Anmeldung ist abgelaufen oder gehört zu einem anderen CRM-Tab. Bitte hier neu verbinden.',
    denied:'Webex hat den Zugriff nicht freigegeben. Bitte erneut verbinden und den angeforderten Zugriff erlauben.',
    scopes:'Webex hat die angeforderten Berechtigungen nicht freigegeben. Bitte die Scopes der Partsunion-CRM-Integration prüfen.',
    provider:'Webex hat die Anmeldung abgelehnt. Bitte die Webex-Integration und das verwendete Konto prüfen.',
    token:'Webex konnte die Anmeldung nicht bestätigen. Bitte erneut verbinden; bei erneutem Fehler muss die Einrichtung geprüft werden.',
    organization:'Bitte mit dem Webex-Konto eurer PartsUnion-Organisation anmelden.',
    assigned:'Dieses Webex-Konto ist bereits mit einem anderen CRM-Benutzer verbunden. Bitte dort die Telefonie trennen oder ein anderes Webex-Konto verwenden.',
    active:'Die Leitung führt gerade ein Gespräch. Bitte zuerst auflegen und danach erneut zuordnen.',
    save:'Die Webex-Verbindung konnte nicht gespeichert werden. Bitte erneut versuchen.',
  };
  const key=reason||'';
  return Object.prototype.hasOwnProperty.call(messages,key)?messages[key]:'Webex konnte nicht verbunden werden. Bitte Konto, Berechtigungen und Einrichtung prüfen.';
}

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
