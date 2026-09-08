import { merken, vergessen, vergessenMitPraefix, SCHLUESSEL } from './zwischenspeicher';

export interface User {
  id?: string;
  must_change_password?: boolean;
  app_access?: { admin: boolean; crm: boolean };
  username: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  active: boolean;
  createdAt?: string;
}

export interface Lead {
  id: string;
  company: string;
  contactPerson: string;
  email: string;
  phone?: string;
  website?: string;
  websiteUrl?: string;
  industry?: string;
  niche?: string;
  city?: string;
  region?: string;
  country?: string;
  address?: string;
  status: string;
  stageId?: string;
  stageCategory?: 'open' | 'won' | 'lost';
  stageEnteredAt?: string;
  source: string;
  value?: number;
  priority?: string;
  assignedTo?: string;
  notes?: string;
  tags: string[];
  /** Auf dem Lead gepflegt: mit dem Entscheider gesprochen? + dessen Name. */
  reachedDecisionMaker?: boolean | null;
  decisionMakerName?: string;
  // AI Analysis Fields
  designScore?: number;
  designAnalysis?: string;
  mobileResponsive?: boolean;
  hasSsl?: boolean;
  loadTimeMs?: number;
  leadScore?: number;
  // Google Places Data
  googleRating?: number;
  socialLinks?: string[];
  openingHours?: string;
  lastContactDate?: string;
  /** Jüngster Protokoll-Eintrag MIT Text — für die Anzeige in der Lead-Liste. */
  lastNote?: string;
  lastNoteType?: string;
  lastNoteBy?: string;
  lastNoteAt?: string;
  nextFollowUpDate?: string;
  scrapedAt?: string;
  lastEvaluatedAt?: string;
  // Sales qualification fields (Autoteile). seats/whatsappNumber/vatId/smallBusiness
  // ARE deep-linked into the admin tenant wizard on "In Onboarding übergeben".
  // NOTE: dealerType/altSystem are CRM-internal qualification metadata only — they
  // are NOT transferred to the wizard (no matching wizard field; the wizard uses a
  // separate businessType enum), so do not rely on them appearing in onboarding.
  dealerType?: 'verwerter' | 'gebrauchtteile' | 'neuteile' | 'werkstatt' | 'mischbetrieb';
  seats?: number;
  whatsappNumber?: string;
  altSystem?: 'abisko' | 'datanorm' | 'jtl' | 'shopware' | 'keins' | 'sonstiges';
  vatId?: string;
  smallBusiness?: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  lastModifiedBy?: string;
  /** Roh-Quellenschlüssel aus dem Backend ('scraper' …) für Quellen-Ansichten. */
  leadSource?: string | null;
  /** IDs eigener Lead-Listen, denen dieser Lead zugeordnet ist. */
  listIds?: string[];
}

/** Eigene (benutzer-erstellte) Lead-Liste. */
export interface LeadList {
  id: string;
  name: string;
  count: number;
  createdAt?: string;
}

/** Ein Scraper-Vorschlag aus der Umkreissuche (vor dem Import). */
export interface ScrapedCandidate {
  name: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  region?: string;
  country?: string;
  dealerType?: 'neuteile' | 'gebrauchtteile';
  niche?: string;
  externalRef: string;
  sourceUrl?: string;
  leadScore?: number;
  emailIsPersonal?: boolean;
}

export type ActivityType = 'note' | 'call' | 'email' | 'meeting' | 'task' | 'stage_change';

export interface Activity {
  id: string;
  leadId: string;
  type: ActivityType;
  /** Gesprächs-/Notiztext („wie lief das Gespräch"). */
  body: string;
  outcome?: string;
  /** Wurde mit dem Entscheider gesprochen? (null = nicht erfasst) */
  reachedDecisionMaker?: boolean | null;
  decisionMakerName?: string;
  /** Bei einer Aktivität, die den Lead verschoben hat. */
  stageFrom?: string | null;
  stageTo?: string | null;
  /** Verfasser — server-attribuiert (über alle Nutzer sichtbar). */
  createdById?: string | null;
  createdByName: string;
  completed?: boolean;
  createdAt: string;
  /** Gesetzt bei Bearbeitung → „bearbeitet"-Hinweis. */
  updatedAt?: string | null;
}

export interface Settings {
  pipelineStages: PipelineStage[];
  sources: string[];
  industries: string[];
  tags: string[];
  companyName: string;
  currency: string;
  statuses: string[];
}

export interface PipelineStage {
  category?: 'open' | 'won' | 'lost';
  id: string;
  name: string;
  color: string;
  order: number;
  probability: number;
  isActive: boolean;
}

const SETTINGS_KEY = 'haendler_crm_settings';
const CURRENT_USER_KEY = 'haendler_crm_current_user';
const TOKEN_KEY = 'haendler_crm_token';

const defaultSettings: Settings = {
  pipelineStages: [
    { id: '1', name: 'Neu', color: 'blue', order: 1, probability: 10, isActive: true },
    { id: '2', name: 'Kontaktiert', color: 'cyan', order: 2, probability: 20, isActive: true },
    { id: '3', name: 'Qualifiziert', color: 'green', order: 3, probability: 40, isActive: true },
    { id: '4', name: 'Angebot', color: 'yellow', order: 4, probability: 60, isActive: true },
    { id: '5', name: 'Verhandlung', color: 'orange', order: 5, probability: 80, isActive: true },
    { id: '6', name: 'Gewonnen', color: 'emerald', order: 6, probability: 100, isActive: true },
    { id: '7', name: 'Verloren', color: 'red', order: 7, probability: 0, isActive: true },
  ],
  sources: ['Website', 'Telefon', 'E-Mail', 'Empfehlung', 'Messe', 'LinkedIn', 'Kaltakquise', 'Partner'],
  industries: ['Automotive', 'Maschinenbau', 'IT & Software', 'Handel', 'Dienstleistung', 'Logistik', 'Produktion', 'Sonstiges'],
  tags: ['VIP', 'Großkunde', 'Neukunde', 'Stammkunde', 'Potenziell', 'Kritisch'],
  companyName: 'Partsunion · CRM',
  currency: 'EUR',
  statuses: ['Neu', 'Kontaktiert', 'Qualifiziert', 'Angebot', 'Verhandlung', 'Gewonnen', 'Verloren'],
};

// --------------------------------------------------------------------------
// Auth — REAL server-side admin authentication (Bot /api/admin-auth/login)
// --------------------------------------------------------------------------
// Frühere Version: reiner localStorage-Vergleich → kein echter Schutz, und die
// Lead-API wurde ganz ohne Credential aufgerufen (→ 401, leere Pipeline). Jetzt
// meldet sich das interne CRM mit einer echten Admin-Session am Bot an
// (Username z.B. "Fecat") und hängt das Session-Token an jeden Lead-Call.
//
// SECURITY (Token-at-Rest, H-2-angelehnt): Das Plattform-Operator-Token wird in
// `sessionStorage` statt `localStorage` gehalten. Begründung & ehrliche Grenzen:
//   • localStorage persistiert den 7-Tage-Admin-Token unbefristet auf der Platte
//     über Browser-Neustarts hinweg und wird über ALLE Tabs/Fenster derselben
//     Origin geteilt. sessionStorage ist tab-/fenster-gebunden und wird beim
//     Schließen des Tabs/Browsers gelöscht → kein langlebiger Token at-rest, und
//     der Token leakt nicht in parallele Tabs. Das verkleinert das Zeit- und
//     Blast-Radius-Fenster eines kompromittierten Geräts.
//   • EHRLICHE GRENZE: sessionStorage ist gegenüber XSS NICHT sicherer als
//     localStorage — same-origin-JS kann beides lesen. Volle H-2-Parität
//     (Access-Token NUR im Speicher + HttpOnly-Refresh-Cookie wie im
//     User-Dashboard) ist hier NICHT frontend-seitig erreichbar:
//       (a) /api/admin-auth/login setzt KEIN separates Refresh-Cookie und es gibt
//           KEIN /api/admin-auth/refresh — der 7-Tage-`admin_session`-Cookie IST
//           das Langlebigkeits-Mittel.
//       (b) ÜBERHOLT seit 2026-08-02. Hier stand, ein reines Cookie-Modell
//           scheitere, weil die authMiddleware vor /api/crm/* und
//           /api/scraper/* nur den `Authorization: Bearer`-Header lese. Das
//           war einmal richtig; inzwischen liest sie das Cookie zuerst:
//
//             // Preferred admin authentication: an HttpOnly cookie.
//             if (!authHeader) {
//                 const cookieToken = req.cookies?.[adminSessionCookieName()];
//                 if (cookieToken) { … applyAdminSession(…); return next(); }
//             }
//
//           Alle Aufrufe hier senden deshalb `credentials: 'include'`, und die
//           Anmeldung kommt ohne Token im Antwortkörper aus. In Produktion
//           schickt das Backend gar keinen mehr — es lag NICHT an falschen
//           Zugangsdaten, sondern daran, dass wir einen erwartet haben.
//
//           Ein Kommentar, der eine Backend-Grenze behauptet, veraltet leise:
//           die Grenze verschwindet, und niemand merkt es, weil der Kommentar
//           plausibel bleibt.
//   • Escape-Hatch: VITE_PERSIST_ACCESS_TOKEN === 'true' → wieder localStorage
//     (geräteübergreifend „eingeloggt bleiben"), spiegelt das Dashboard-Flag.

const PERSIST_TOKEN_IN_LOCALSTORAGE = import.meta.env.VITE_PERSIST_ACCESS_TOKEN === 'true';

/**
 * Zugriff auf einen Browserspeicher, der auch dann nicht wirft, wenn es ihn
 * nicht gibt.
 *
 * Der Zugriff auf `localStorage` ist NICHT verlässlich: In Safaris privatem
 * Modus, bei blockierten Website-Daten und in verwalteten Firmenbrowsern wirft
 * schon das blosse Lesen der Eigenschaft einen SecurityError. Vorher reichte
 * das aus, um die gesamte Anwendung lahmzulegen — getToken() wirft, jeder
 * API-Aufruf wirft, und der Nutzer sieht eine leere Seite ohne Erklaerung.
 *
 * Dieselbe Fehlerklasse steckte im Admin-Dashboard in impersonationSession.ts
 * und ist dort auf demselben Weg behoben.
 *
 * Ohne Speicher gilt: nicht angemeldet. Das ist die richtige Annahme — lieber
 * ein Anmeldebildschirm als ein Absturz.
 */
function speicher(bevorzugt: 'session' | 'local'): Storage | null {
  try {
    const s = bevorzugt === 'local' ? globalThis.localStorage : globalThis.sessionStorage;
    if (!s) return null;
    // Zugriff erzwingen: manche Browser werfen erst hier, nicht beim Lesen
    // der Eigenschaft.
    s.getItem('__probe__');
    return s;
  } catch {
    return null;
  }
}

/** Der Speicher für die Session (Token + gecachter User). Default sessionStorage. */
function sessionStore(): Storage | null {
  return speicher(PERSIST_TOKEN_IN_LOCALSTORAGE ? 'local' : 'session');
}

export function getToken(): string | null {
  // sessionStorage zuerst; Fallback localStorage fängt Alt-Tokens ab, die eine
  // frühere (localStorage-)Version geschrieben hat → kein erzwungenes Re-Login
  // nach dem Deploy. Der Alt-Token wird beim nächsten Login migriert/überschrieben.
  return sessionStore()?.getItem(TOKEN_KEY) ?? speicher('local')?.getItem(TOKEN_KEY) ?? null;
}

function setToken(token: string): void {
  sessionStore()?.setItem(TOKEN_KEY, token);
  // Etwaigen Alt-Token aus dem jeweils anderen Speicher räumen, damit das Token
  // nicht doppelt (und an-rest in localStorage) liegt.
  if (!PERSIST_TOKEN_IN_LOCALSTORAGE) speicher('local')?.removeItem(TOKEN_KEY);
}

/** Authorization-Header für die Bot-API (leer, falls nicht eingeloggt). */
export function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = getToken();
  return { 'X-Partsunion-App': 'crm', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra };
}

/**
 * Echte Admin-Anmeldung gegen den Bot. Bei Erfolg wird Session-Token + User
 * persistiert. Gibt den User zurück (oder null bei falschen Daten / Netzfehler).
 */
export class AuthenticationChallenge extends Error {
  constructor(public readonly invalid = false) { super(invalid ? 'Der Sicherheitscode ist ungültig. Bitte erneut versuchen.' : 'Bitte den Code aus deiner Authenticator-App oder einen Wiederherstellungscode eingeben.'); }
}

export async function authenticate(username: string, password: string, totpCode?: string): Promise<User | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin-auth/login`, {
      credentials: 'include',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, app: 'crm', ...(totpCode ? { totp_code: totpCode } : {}) }),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      if (error.requires_2fa || error.code === 'MFA_REQUIRED' || error.code === 'MFA_INVALID') throw new AuthenticationChallenge(error.code === 'MFA_INVALID');
      return null;
    }
    const data = await res.json();

    /**
     * Zwei Betriebsarten — je nachdem, was das Backend liefert.
     *
     * COOKIE (Produktion): die Antwort enthält KEIN `access`. Das
     * Sitzungstoken steckt im httpOnly-Cookie `admin_session`, das der Browser
     * ab jetzt bei jeder Anfrage mitschickt (alle Aufrufe hier senden
     * `credentials: 'include'`). `authMiddleware` akzeptiert es:
     *
     *   // Preferred admin authentication: an HttpOnly cookie.
     *   if (!authHeader) { const cookieToken = req.cookies?.[…]; … }
     *
     * BEARER (Entwicklung, oder mit ADMIN_ALLOW_LEGACY_TOKEN_RESPONSE=true):
     * das Token kommt im Körper und wird wie bisher abgelegt.
     *
     * Hier stand `if (!token) return null` — ein stiller Abbruch, der von
     * aussen wie ein falsches Kennwort aussah. Die Anmeldung war zu dem
     * Zeitpunkt serverseitig längst erfolgreich und das Cookie gesetzt.
     */
    clearSession();
    const token: string | undefined = data?.access || data?.token;
    if (token) setToken(token);

    const user: User = {
      id: data?.user?.id,
      username: data?.user?.username || username,
      name: data?.user?.username || username,
      email: data?.user?.email,
      role: data?.user?.crm_role || data?.user?.role || 'sales',
      app_access: data?.user?.app_access,
      must_change_password: Boolean(data?.user?.must_change_password || data?.must_change_password),
      active: true,
      createdAt: new Date().toISOString(),
    };
    // setToken steht oben, direkt bei der Auswertung — hier wäre es der
    // zweite Aufruf und im Cookie-Fall ein `setToken(undefined)`.
    sessionStore()?.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    if (!PERSIST_TOKEN_IN_LOCALSTORAGE) speicher('local')?.removeItem(CURRENT_USER_KEY);
    return user;
  } catch (error) {
    if (error instanceof AuthenticationChallenge) throw error;
    console.error('Login failed:', error);
    return null;
  }
}

// Logout — Token + User aus BEIDEN Speichern entfernen (auch ein evtl. Alt-Token
// aus localStorage), damit nach dem Abmelden keine Session-Reste at-rest bleiben.
export async function logout(): Promise<void> {
  const headers = authHeaders({ 'Content-Type': 'application/json' });
  clearSession();
  const res = await fetch(`${API_BASE_URL}/api/admin-auth/logout`, {
    credentials: 'include', method: 'POST', headers, body: JSON.stringify({ app: 'crm' }),
  });
  if (!res.ok && res.status !== 401) throw new Error('Die Sitzung konnte nicht beendet werden. Bitte erneut abmelden.');
}

function clearSession() {
  // Alles Gemerkte weg: sonst saehe der naechste Anmelder auf demselben
  // Rechner fuer bis zu eine Minute die Daten des vorigen.
  vergessen();
  speicher('local')?.removeItem('haendler_crm_passwords');
  for (const art of ['session', 'local'] as const) {
    const s = speicher(art);
    s?.removeItem(CURRENT_USER_KEY);
    s?.removeItem(TOKEN_KEY);
  }
}

// Get current user
export function getCurrentUser(): User | null {
  const roh = sessionStore()?.getItem(CURRENT_USER_KEY)
    ?? speicher('local')?.getItem(CURRENT_USER_KEY);
  if (!roh) return null;
  try {
    return JSON.parse(roh) as User;
  } catch {
    // Beschaedigter Eintrag (halber Schreibvorgang, fremdes Format aus einer
    // aelteren Fassung). Vorher warf JSON.parse hier und riss die ganze
    // Anwendung mit — obwohl "nicht angemeldet" die richtige Antwort ist.
    return null;
  }
}

// Check if user is logged in
export function isLoggedIn(): boolean {
  return getCurrentUser() !== null;
}

// --------------------------------------------------------------------------
// API Integration - Website CRM Scraper Backend
// --------------------------------------------------------------------------

// Bot-API. Der CRM-Router ist unter /api/crm gemountet → Leads liegen unter
// /api/crm/leads (NICHT /api/leads). Default ist die Prod-API; per Build-Arg
// VITE_API_BASE_URL überschreibbar.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.partsunion.de';
const LEADS_PATH = '/api/crm/leads';

/**
 * Session abgelaufen/ungültig (401 ODER 403 „Invalid or unauthorized token").
 * Abmelden + Hard-Reload → isLoggedIn()=false → sauberer Login-Screen statt
 * kryptischer 403-Fehler in der Konsole. Nur EINMAL (nach logout kein Token mehr).
 */
function onAuthExpired(): void {
  clearSession();
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('crm:session-expired'));
}

export async function validateSession(): Promise<User | null> {
  const res = await fetch(`${API_BASE_URL}/api/admin-auth/me?app=crm`, { credentials: 'include', headers: authHeaders() });
  if (res.status === 401 || res.status === 403) { clearSession(); return null; }
  await assertResponse(res, 'Sitzung konnte nicht geprüft werden.');
  const data = await res.json();
  const raw = data.user || data;
  if (!raw.username || raw.app_access?.crm === false) { clearSession(); return null; }
  const user: User = { id: raw.id, username: raw.username, name: raw.full_name || raw.username, email: raw.email,
    role: raw.crm_role || raw.role || 'sales', active: true, app_access: raw.app_access,
    must_change_password: Boolean(raw.must_change_password || data.must_change_password) };
  sessionStore()?.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  return user;
}

export async function accountRequest(action: 'request-reset' | 'reset-password' | 'change-password', body: Record<string, string>): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/admin-auth/${action}`, { credentials: 'include', method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ ...body, app: 'crm' }) });
  await assertResponse(res, action === 'request-reset' ? 'Anfrage konnte nicht gesendet werden.' : 'Passwort konnte nicht geändert werden.');
  if (action !== 'request-reset') clearSession();
}

export async function mfaRequest<T = { secret: string; otpauth_url: string }>(action?: 'enroll' | 'confirm', body?: Record<string, string>): Promise<T> {
  const res = await fetch(API_BASE_URL + '/api/admin-auth/mfa' + (action ? '/' + action : ''), { credentials: 'include',
    method: action ? 'POST' : 'GET', headers: authHeaders({ 'Content-Type': 'application/json' }), ...(action ? { body: JSON.stringify({ ...body, app: 'crm' }) } : {}) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (!action && res.status === 401) onAuthExpired();
    throw new Error(res.status === 429 ? 'Zu viele Versuche. Bitte später erneut versuchen.' : data.message || data.error || 'Sicherheitsänderung fehlgeschlagen.');
  }
  return data as T;
}

async function assertResponse(res: Response, message: string): Promise<void> {
  if (res.ok) return;
  if (res.status === 401) onAuthExpired();
  if (res.status === 429) throw new Error('Zu viele Versuche. Bitte in einigen Minuten erneut versuchen.');
  throw new Error(message);
}

export async function getTeamUsers(): Promise<User[]> {
  const res = await fetch(`${API_BASE_URL}/api/crm/users`, { credentials: 'include', headers: authHeaders() });
  await assertResponse(res, 'Vertriebsteam konnte nicht geladen werden.');
  const data = await res.json();
  return (Array.isArray(data) ? data : data.users || []).map((u: { id: string; username: string; full_name?: string; email?: string; role: string }) =>
    ({ id: u.id, username: u.username, name: u.full_name || u.username, email: u.email, role: u.role, active: true }));
}

export interface CrmTeam { id: string; name: string; description: string; active: boolean; memberIds: string[] }
export async function getTeams(): Promise<CrmTeam[]> {
  const res = await fetch(`${API_BASE_URL}/api/crm/teams`, { credentials: 'include', headers: authHeaders() });
  await assertResponse(res, 'Teams konnten nicht geladen werden.');
  return (await res.json()).teams || [];
}
export async function saveTeam(team: Omit<CrmTeam, 'id'> & { id?: string }): Promise<void> {
  const { id, ...body } = team;
  const res = await fetch(`${API_BASE_URL}/api/crm/teams${id ? `/${encodeURIComponent(id)}` : ''}`, {
    credentials: 'include', method: id ? 'PATCH' : 'POST', headers: authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(body),
  });
  await assertResponse(res, 'Team konnte nicht gespeichert werden. Prüfe Name, Mitglieder und deine Berechtigung.');
}

/**
 * Alle Leads.
 *
 * Die schwerste Abfrage im CRM: 533 Datensätze, rund 405 KB. Sie kommt bei
 * jedem Ansichtswechsel erneut, weil die Ansichten beim Wechsel komplett neu
 * aufgebaut werden — deshalb der Zwischenspeicher. Jede eigene Änderung
 * (`saveLead`, `deleteLead`, `mergeLeads`) wirft ihn weg.
 *
 * Fehler werden weitergegeben: Die Ansicht zeigt einen Retry-Zustand und
 * verwechselt einen Ausfall nicht mit einem tatsächlich leeren Bestand.
 *
 * Das `try` steht deshalb AUSSEN, um `merken` herum. Läge es innen, wäre die
 * leere Liste ein erfolgreiches Ergebnis und würde mitgespeichert — nach
 * einem kurzen Netzaussetzer sähe man eine Minute lang „keine Leads", obwohl
 * längst wieder alles erreichbar ist. So wandert der Fehler durch `merken`
 * hindurch, das den Eintrag verwirft, und erst hier wird er abgefangen.
 */
export async function getLeads(): Promise<Lead[]> {
  try {
    return await merken(SCHLUESSEL.leads, async () => {
      const res = await fetch(`${API_BASE_URL}${LEADS_PATH}`, {
        credentials: 'include',
        headers: authHeaders(),
      });
      if (res.status === 401 || res.status === 403) {
        // Session abgelaufen / ungültiger Token → sauber abmelden + Login zeigen.
        onAuthExpired();
        throw new Error('Sitzung abgelaufen');
      }
      if (!res.ok) throw new Error('Failed to fetch leads');
      const rows = (await res.json()) as Lead[];
      return rows.map((lead) => ({ ...lead, updatedAt: lead.updatedAt || lead.createdAt }));
    });
  } catch (error) {
    throw error instanceof Error ? error : new Error('Leads konnten nicht geladen werden.');
  }
}

export async function saveLead(lead: Partial<Lead>): Promise<void> {
  // Gemerkte Leadliste wegwerfen: was man selbst gerade gespeichert hat,
  // gleich darauf im alten Stand zu sehen, waere schlimmer als jede Wartezeit.
  vergessen(SCHLUESSEL.leads);
  try {
    if (lead.id) {
      // Update existing lead
      const res = await fetch(`${API_BASE_URL}${LEADS_PATH}/${lead.id}`, {
        credentials: 'include',
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(lead)
      });
      await assertResponse(res, 'Lead konnte nicht gespeichert werden.');
    } else {
      // Create new lead
      const res = await fetch(`${API_BASE_URL}${LEADS_PATH}/internal`, {
        credentials: 'include',
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(lead)
      });
      await assertResponse(res, 'Lead konnte nicht angelegt werden.');
    }
  } catch (error) {
    console.error('Error saving lead:', error);
    throw error;
  }
}

// ── Dubletten-Erkennung + Merge ─────────────────────────────────────────────
export interface DuplicateMember {
  id: string;
  company: string;
  contactPerson: string;
  email: string;
  phone: string;
  website: string;
  city: string;
  status: string;
  source: string;
  createdAt: string | null;
  activityCount: number;
  lastContactDate: string | null;
}
export interface DuplicateGroup {
  reasons: string[];               // 'phone' | 'domain' | 'email' | 'name'
  confidence: 'high' | 'medium';
  members: DuplicateMember[];
}

/** Scannt den Bestand und liefert Gruppen wahrscheinlicher Dubletten. */
export async function getDuplicateGroups(): Promise<{ groups: DuplicateGroup[]; scanned: number }> {
  const res = await fetch(`${API_BASE_URL}${LEADS_PATH}/duplicates`, { credentials: 'include', headers: authHeaders() });
  if (res.status === 401 || res.status === 403) { onAuthExpired(); throw new Error('Sitzung abgelaufen'); }
  if (!res.ok) throw new Error('Dubletten-Scan fehlgeschlagen');
  return await res.json();
}

/** Führt Duplikate in den Haupt-Lead zusammen (Aktivitäten/Termine/Listen umhängen, Duplikat archivieren). */
export async function mergeLeads(primaryId: string, mergeIds: string[]): Promise<{ merged: number }> {
  // Haengt Aktivitaeten, Termine und Listenzugehoerigkeiten um — danach
  // stimmt keine der gemerkten Listen mehr.
  vergessen();
  const res = await fetch(`${API_BASE_URL}${LEADS_PATH}/merge`, {
    credentials: 'include',
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ primaryId, mergeIds }),
  });
  if (!res.ok) {
    let msg = 'Zusammenführen fehlgeschlagen';
    try { msg = (await res.json()).error || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  return await res.json();
}

export async function deleteLead(id: string): Promise<void> {
  vergessen(SCHLUESSEL.leads);
  try {
    const res = await fetch(`${API_BASE_URL}${LEADS_PATH}/${id}`, {
      credentials: 'include',
      method: 'DELETE',
      headers: authHeaders(),
    });
    await assertResponse(res, 'Lead konnte nicht gelöscht werden.');
  } catch (error) {
    console.error('Error deleting lead:', error);
    throw error;
  }
}

// Scraper API Functions
export async function evaluateWebsite(url: string, niche?: string, companyName?: string, city?: string): Promise<unknown> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/scraper/evaluate`, {
      credentials: 'include',
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ url, niche, companyName, city })
    });
    if (!res.ok) throw new Error('Failed to evaluate website');
    return await res.json();
  } catch (error) {
    console.error('Error evaluating website:', error);
    throw error;
  }
}

export async function startScraping(websites: string[], niche: string, location?: string): Promise<{ jobId: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/scraper/start`, {
      credentials: 'include',
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ websites, niche, location })
    });
    if (!res.ok) throw new Error('Failed to start scraping');
    return await res.json();
  } catch (error) {
    console.error('Error starting scraper:', error);
    throw error;
  }
}

export async function getScrapingStatus(jobId: string): Promise<{ status: string; processed: number; total: number }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/scraper/status/${jobId}`, {
      credentials: 'include',
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to get scraping status');
    return await res.json();
  } catch (error) {
    console.error('Error getting scraping status:', error);
    throw error;
  }
}

// Radius Search API - Umkreissuche mit Google Places
export async function startRadiusSearch(
  location: string,
  radiusKm: number,
  niche: string,
  scoreThreshold: number = 60
): Promise<{ jobId: string; message: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/scraper/radius-search`, {
      credentials: 'include',
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ location, radiusKm, niche, scoreThreshold })
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to start radius search');
    }
    return await res.json();
  } catch (error) {
    console.error('Error starting radius search:', error);
    throw error;
  }
}

// ... Keep other LocalStorage functions (Users, Settings) as they are for now?
// Actually, user wants "CRM Data" persisted. Users/Settings might be fine local for now?
// Let's stick to LEADS for the main InvenTree integration.

// ── Lead-Aktivitäten (server-seitig, nutzer-attribuiert) ────────────────────
// Früher reiner localStorage-Speicher (pro Gerät, nicht geteilt). Jetzt echtes
// Backend-Protokoll: alle Nutzer sehen dieselben Einträge inkl. Verfasser.

export interface ActivityInput {
  type: ActivityType;
  body?: string;
  outcome?: string;
  reachedDecisionMaker?: boolean | null;
  decisionMakerName?: string;
  /** Optionaler Statuswechsel → verschiebt den Lead direkt in der Pipeline. */
  stageTo?: string | null;
}

export async function getActivities(leadId: string): Promise<Activity[]> {
  const res = await fetch(`${API_BASE_URL}${LEADS_PATH}/${leadId}/activities`, { credentials: 'include', headers: authHeaders() });
  await assertResponse(res, 'Aktivitäten konnten nicht geladen werden.');
  return await res.json();
}

export async function createActivity(leadId: string, input: ActivityInput): Promise<Activity> {
  const res = await fetch(`${API_BASE_URL}${LEADS_PATH}/${leadId}/activities`, {
    credentials: 'include',
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    let msg = 'Aktivität konnte nicht gespeichert werden';
    try { msg = (await res.json()).error || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  return await res.json();
}

export async function updateActivity(leadId: string, id: string, patch: Partial<ActivityInput> & { completed?: boolean }): Promise<Activity> {
  const res = await fetch(`${API_BASE_URL}${LEADS_PATH}/${leadId}/activities/${id}`, {
    credentials: 'include',
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error('Aktivität konnte nicht aktualisiert werden');
  return await res.json();
}

export async function deleteActivity(leadId: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}${LEADS_PATH}/${leadId}/activities/${id}`, {
    credentials: 'include',
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok && res.status !== 204) throw new Error('Aktivität konnte nicht gelöscht werden');
}
/**
 * DIE kanonische Status-Liste für Masken, Filter und Boards.
 *
 * Früher gab es zwei getrennte Listen (settings.statuses für die Masken,
 * settings.pipelineStages fürs Pipeline-Setup) — eine im Pipeline-Setup
 * angelegte Stage („Broschüre", „Warm Halten") tauchte deshalb NICHT in der
 * Lead-Maske auf. Jetzt leiten sich die Optionen aus den aktiven Stages (in
 * Setup-Reihenfolge) ab; Alt-Statuses ohne Stage bleiben hinten angehängt,
 * damit bestehende Leads mit solchen Werten filterbar bleiben.
 */
export function getStatusOptions(): string[] {
  const s = getSettings();
  const fromStages = (s.pipelineStages || [])
    .filter((st) => st.isActive)
    .sort((a, b) => a.order - b.order)
    .map((st) => st.name);
  const extras = (s.statuses || []).filter((x) => !fromStages.includes(x));
  return [...fromStages, ...extras];
}

export function getSettings(): Settings {
  // Synchroner Read aus dem localStorage-CACHE. Quelle der Wahrheit ist der
  // Server (GET /api/crm/settings) — syncSettingsFromServer() füllt den Cache
  // beim App-Start und über den Aktualisieren-Button.
  const data = localStorage.getItem(SETTINGS_KEY);
  return data ? { ...defaultSettings, ...JSON.parse(data) } : defaultSettings;
}

/**
 * Speichert die Einstellungen — lokal sofort, geteilt auf dem Server.
 *
 * Gibt zurück, ob der SERVER es angenommen hat. Der Aufrufer muss das
 * auswerten: nur lokal gespeichert heisst, dass die Änderung beim nächsten
 * Laden wieder verschwindet. Wer hier „gespeichert" meldet, ohne den Wert
 * anzusehen, belügt den Benutzer.
 *
 * Der localStorage wird trotzdem geschrieben, auch wenn der Server ablehnt:
 * die Oberfläche soll den eingegebenen Stand zeigen, solange man auf der
 * Seite ist. Verloren geht er erst beim Neuladen — und genau davor warnt
 * dann die Meldung.
 */
export async function saveSettings(settings: Settings): Promise<{ ok: boolean; grund?: string }> {
  const result = await pushSettingsToServer(settings);
  if (result.ok) {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* Server remains authoritative. */ }
  }
  return result;
}

const SETTINGS_PATH = '/api/crm/settings';

/**
 * Schreibt die Einstellungen auf den Server und sagt, ob es geklappt hat.
 *
 * ─── Was hier vorher schiefging ───────────────────────────────────────────
 *
 * Der Rückgabewert war `void`, und der `await fetch(…)` prüfte `res.ok` NICHT.
 * Ein `fetch` wirft nur bei Netzfehlern — eine 403, weil dem Benutzer das
 * Recht `settings.write` fehlt, kommt als ganz normale Antwort zurück.
 *
 * Die Folge war der unangenehmste Fehler, den eine Einstellungsseite haben
 * kann: Man legt einen Status an, bekommt „Einstellungen gespeichert",
 * arbeitet weiter — und beim nächsten Laden ist er weg. Denn im
 * localStorage stand er, auf dem Server nicht, und `syncSettingsFromServer`
 * überschreibt beim Start den lokalen Stand mit dem des Servers.
 *
 * Kein Fehler im Protokoll, keine Meldung, nichts. Nur verschwundene Arbeit.
 */
async function pushSettingsToServer(settings: Settings): Promise<{ ok: boolean; grund?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}${SETTINGS_PATH}`, {
      credentials: 'include',
      method: 'PUT',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ settings }),
    });
    if (res.status === 401 || res.status === 403) {
      return { ok: false, grund: 'Dazu fehlt Ihnen die Berechtigung.' };
    }
    if (!res.ok) return { ok: false, grund: `Der Server antwortete mit ${res.status}.` };
    return { ok: true };
  } catch (e) {
    console.error('Settings-Sync zum Server fehlgeschlagen:', e);
    return { ok: false, grund: 'Der Server ist nicht erreichbar.' };
  }
}

/**
 * Holt die geteilten Einstellungen vom Server in den localStorage-Cache.
 * Bootstrap-Fall: Hat der Server noch KEINE Einstellungen, aber dieser Browser
 * lokal angepasste (z. B. neuer Status „Broschüre"), werden die lokalen einmal
 * hochgeladen — so wandert der Alt-Stand des Erstellers automatisch zu allen.
 * Gibt true zurück, wenn sich der lokale Cache geändert hat.
 */
export async function syncSettingsFromServer(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}${SETTINGS_PATH}`, { credentials: 'include', headers: authHeaders() });
    if (res.status === 401 || res.status === 403) return false;
    if (!res.ok) return false;
    const data = await res.json();
    const server = data?.settings;
    if (server && typeof server === 'object') {
      const merged = { ...defaultSettings, ...server };
      const before = localStorage.getItem(SETTINGS_KEY);
      const after = JSON.stringify(merged);
      localStorage.setItem(SETTINGS_KEY, after);
      return before !== after;
    }
    // Server leer → lokale Anpassungen (falls vorhanden) als Startstand hochladen.
    const local = localStorage.getItem(SETTINGS_KEY);
    if (local) void pushSettingsToServer({ ...defaultSettings, ...JSON.parse(local) });
    return false;
  } catch {
    return false;
  }
}

// --------------------------------------------------------------------------
// Lead-Listen (eigene Listen) + Scraper-Vorschau/Import
// --------------------------------------------------------------------------

const LEAD_LISTS_PATH = '/api/crm/lead-lists';

export async function getLeadLists(): Promise<LeadList[]> {
  try {
    return await merken(SCHLUESSEL.leadListen, async () => {
      const res = await fetch(`${API_BASE_URL}${LEAD_LISTS_PATH}`, { credentials: 'include', headers: authHeaders() });
      if (!res.ok) throw new Error('Lead-Listen konnten nicht geladen werden');
      return (await res.json()) as LeadList[];
    });
  } catch (error) {
    console.error('Error loading lead lists:', error);
    return [];
  }
}

export async function createLeadList(name: string): Promise<LeadList | null> {
  vergessen(SCHLUESSEL.leadListen);
  const res = await fetch(`${API_BASE_URL}${LEAD_LISTS_PATH}`, {
    credentials: 'include',
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('Liste konnte nicht erstellt werden');
  return await res.json();
}

export async function deleteLeadList(id: string): Promise<void> {
  // Die Zugehoerigkeit steht auch an jedem Lead — beide wegwerfen.
  vergessen(SCHLUESSEL.leadListen);
  vergessen(SCHLUESSEL.leads);
  const res = await fetch(`${API_BASE_URL}${LEAD_LISTS_PATH}/${id}`, { credentials: 'include', method: 'DELETE', headers: authHeaders() });
  await assertResponse(res, 'Liste konnte nicht gelöscht werden.');
}

export async function addLeadsToList(listId: string, leadIds: string[]): Promise<void> {
  vergessen(SCHLUESSEL.leads);
  const res = await fetch(`${API_BASE_URL}${LEAD_LISTS_PATH}/${listId}/members`, {
    credentials: 'include',
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ leadIds }),
  });
  if (!res.ok) throw new Error('Leads konnten nicht zugeordnet werden');
}

export async function removeLeadsFromList(listId: string, leadIds: string[]): Promise<void> {
  vergessen(SCHLUESSEL.leads);
  const res = await fetch(`${API_BASE_URL}${LEAD_LISTS_PATH}/${listId}/members`, {
    credentials: 'include',
    method: 'DELETE',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ leadIds }),
  });
  await assertResponse(res, 'Leads konnten nicht aus der Liste entfernt werden.');
}

/** Umkreissuche-Vorschau: liefert Treffer zur Auswahl (ohne Import). */
export async function scraperSearch(
  location: string,
  radiusKm: number,
  niche: string,
  country = 'DE',
): Promise<ScrapedCandidate[]> {
  const res = await fetch(`${API_BASE_URL}/api/scraper/search`, {
    credentials: 'include',
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ location, radiusKm, niche, country }),
  });
  if (!res.ok) {
    let msg = 'Suche fehlgeschlagen';
    try { msg = (await res.json()).error || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  const data = await res.json();
  return Array.isArray(data.candidates) ? data.candidates : [];
}

/** Eine erkannte Dublette (Kandidat passt zu bestehendem Lead) zur Auflösung. */
export interface ImportConflict {
  candidate: ScrapedCandidate;
  matchedBy: 'domain' | 'email' | 'phone';
  existing: { id: string; company: string; email: string; phone: string; website: string; source: string };
}
export interface ImportResult {
  imported: number;
  updated: number;
  total: number;
  conflicts?: ImportConflict[];
}

/** Importiert die ausgewählten Treffer (mit E-Mail-Anreicherung) + optional in eine Liste.
 *  Dubletten (gleiche Domain/E-Mail/Telefon) werden NICHT importiert, sondern als
 *  `conflicts` zur Auflösung zurückgegeben — so entstehen keine Doppel-Einträge. */
export async function importScraped(
  candidates: ScrapedCandidate[],
  listId?: string | null,
): Promise<ImportResult> {
  // Legt neue Leads an.
  vergessen(SCHLUESSEL.leads);
  const res = await fetch(`${API_BASE_URL}/api/crm/leads/import-scraped`, {
    credentials: 'include',
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ candidates, listId: listId || undefined }),
  });
  if (!res.ok) {
    let msg = 'Import fehlgeschlagen';
    try { msg = (await res.json()).error || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  return await res.json();
}

export interface ScraperJobStatus {
  status: 'queued' | 'running' | 'done' | 'error' | 'cancelled';
  processed: number;
  total: number;
  imported: number;
  updated: number;
  found: number;
  error?: string;
}

/** Großer Scrape: ganzes Land (Top-Städte) → Hintergrund-Job. */
export async function countryScrape(country: string, niche: string, radiusKm = 20): Promise<{ jobId: string; cities: number }> {
  const res = await fetch(`${API_BASE_URL}/api/scraper/country-scrape`, {
    credentials: 'include',
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ country, niche, radiusKm }),
  });
  if (!res.ok) {
    let msg = 'Großer Scrape konnte nicht gestartet werden';
    try { msg = (await res.json()).error || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  return await res.json();
}

export async function scraperJobStatus(jobId: string): Promise<ScraperJobStatus> {
  const res = await fetch(`${API_BASE_URL}/api/scraper/status/${jobId}`, { credentials: 'include', headers: authHeaders() });
  if (!res.ok) throw new Error('Status nicht abrufbar');
  return await res.json();
}

/** Laufenden Scraper-Job stoppen (Großer Scrape etc.). Bereits importierte Leads
 *  bleiben erhalten; der Job endet an der nächsten Iterationsgrenze. */
export async function cancelScraperJob(jobId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/scraper/cancel/${jobId}`, {
    credentials: 'include',
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
  });
  if (!res.ok) {
    let msg = 'Job konnte nicht gestoppt werden';
    try { msg = (await res.json()).error || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
}

/** Ergebnis eines Backfill-Batches (POST /leads/enrich-missing). */
export interface EnrichMissingResult {
  checked: number;
  phonesFound: number;
  emailsFound: number;
  remaining: number;
}

/** Bestands-Backfill: Leads mit Website aber ohne Telefon batchweise über den
 *  Scraper (Impressum/Kontakt) anreichern. Ein Aufruf = ein Batch; der Aufrufer
 *  loopt, bis `remaining` 0 ist. */
export async function enrichMissingContacts(limit = 25): Promise<EnrichMissingResult> {
  const res = await fetch(`${API_BASE_URL}${LEADS_PATH}/enrich-missing`, {
    credentials: 'include',
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ limit }),
  });
  if (res.status === 401 || res.status === 403) { onAuthExpired(); throw new Error('Sitzung abgelaufen'); }
  if (!res.ok) {
    let msg = 'Anreicherung fehlgeschlagen';
    try { msg = (await res.json()).error || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  return await res.json();
}

export type DuplicateAction = 'keep' | 'overwrite' | 'merge';

/** Wendet die Nutzer-Entscheidungen zu Dubletten an (kein neuer Datensatz wird erzeugt). */
export async function resolveDuplicates(
  resolutions: { candidate: ScrapedCandidate; existingId: string; action: DuplicateAction }[],
  listId?: string | null,
): Promise<{ overwritten: number; merged: number; kept: number }> {
  // Archiviert oder verschmilzt Datensaetze — die Leadliste stimmt danach nicht mehr.
  vergessen();
  const res = await fetch(`${API_BASE_URL}/api/crm/leads/resolve-duplicates`, {
    credentials: 'include',
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ resolutions, listId: listId || undefined }),
  });
  if (!res.ok) {
    let msg = 'Auflösung fehlgeschlagen';
    try { msg = (await res.json()).error || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  return await res.json();
}

// ── Termine / Kalender (Quali- & Sales-Calls) ─────────────────────────────────
// Server-seitig (Bot /api/crm/appointments) — dieselben Daten wie im Admin-Dashboard.

const APPT_PATH = '/api/crm/appointments';

export type AppointmentType = 'quali' | 'sales' | 'call' | 'other';
export type AppointmentStatus = 'proposed' | 'confirmed' | 'declined' | 'cancelled' | 'completed' | 'no_show';

export interface Appointment {
  teams_meeting?: { requested?: boolean; state?: 'pending' | 'ready' | 'failed' | 'cancelled'; error?: string };
  invitation_from?: string | null;
  id: string;
  type: string;
  title: string;
  notes: string | null;
  assignee_id: string | null;
  assignee_name: string | null;
  created_by_id: string | null;
  created_by_name: string | null;
  company_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  start_at: string;
  end_at: string;
  duration_minutes: number;
  location: string | null;
  meeting_link: string | null;
  status: string;
  public_token: string | null;
  invite_sent_at: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppointmentAdmin { id: string; username: string; name: string; email: string; teamsAvailable?: boolean }

export interface AppointmentInput {
  createTeams?: boolean;
  type?: AppointmentType;
  title?: string;
  notes?: string;
  assigneeId?: string;
  /** Verknüpfung zum CRM-Lead (appointments.company_id). */
  companyId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  start?: string;            // "YYYY-MM-DDTHH:MM"
  durationMinutes?: number;
  location?: string;
  meetingLink?: string;
  sendInvite?: boolean;
  status?: AppointmentStatus;
  resendInvite?: boolean;
}

export interface AppointmentMutation {
  appointment: Appointment;
  inviteSent: boolean;
  inviteError?: string;
  calendarSynced?: boolean;
  calendarError?: string;
  calendarDecision?: {
    eligible: boolean;
    type: Appointment['type'];
    reason: string;
    confidence: number;
  };
}

export async function getAppointments(params: { from?: string; to?: string; assigneeId?: string; companyId?: string } = {}, fresh = false): Promise<Appointment[]> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, String(v)); });
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  // Der Zeitraum gehoert in den Schluessel: Januar und Februar sind zwei
  // verschiedene Antworten. Ohne ihn bekaeme das Blaettern im Kalender
  // stillschweigend immer denselben Monat zurueck.
  if (fresh) vergessen(SCHLUESSEL.termine(suffix));
  return merken(SCHLUESSEL.termine(suffix), async () => {
    const res = await fetch(`${API_BASE_URL}${APPT_PATH}${suffix}`, { credentials: 'include', headers: authHeaders() });
    if (res.status === 401 || res.status === 403) { onAuthExpired(); throw new Error('Sitzung abgelaufen'); }
    if (!res.ok) throw new Error('Termine konnten nicht geladen werden');
    const data = await res.json();
    return Array.isArray(data.appointments) ? data.appointments : [];
  });
}

export async function getAppointmentAdmins(): Promise<AppointmentAdmin[]> {
  try {
    return await merken(SCHLUESSEL.termineAdmins, async () => {
      const res = await fetch(`${API_BASE_URL}${APPT_PATH}/admins`, { credentials: 'include', headers: authHeaders() });
      if (!res.ok) throw new Error('Zuständige konnten nicht geladen werden');
      const data = await res.json();
      return Array.isArray(data.admins) ? (data.admins as AppointmentAdmin[]) : [];
    });
  } catch {
    return [];
  }
}

export async function createAppointment(input: AppointmentInput): Promise<AppointmentMutation> {
  // Jede Terminaenderung entwertet ALLE Zeitraeume — siehe vergessenMitPraefix.
  vergessenMitPraefix('termine:');
  const res = await fetch(`${API_BASE_URL}${APPT_PATH}`, {
    credentials: 'include',
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    let msg = 'Termin konnte nicht angelegt werden';
    try { msg = (await res.json()).error || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  return await res.json();
}

export async function saveCrmCallback(leadId:string,id:string,input:{start:string;durationMinutes:number;assigneeId:string;notes:string}):Promise<AppointmentMutation>{
  const response = await fetch(`${API_BASE_URL}/api/crm/workflow/leads/${encodeURIComponent(leadId)}/callbacks/${encodeURIComponent(id)}`, {
    credentials: 'include',
    method: 'PUT', headers: authHeaders({'Content-Type':'application/json'}), body: JSON.stringify(input),
  });
  const result = await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(result.error||'Der Rückruf konnte nicht gespeichert werden.');
  vergessenMitPraefix('termine:');
  vergessenMitPraefix('leads');
  return result;
}

export async function updateAppointment(id: string, patch: AppointmentInput): Promise<AppointmentMutation> {
  // Jede Terminaenderung entwertet ALLE Zeitraeume — siehe vergessenMitPraefix.
  vergessenMitPraefix('termine:');
  const res = await fetch(`${API_BASE_URL}${APPT_PATH}/${id}`, {
    credentials: 'include',
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error('Termin konnte nicht aktualisiert werden');
  return await res.json();
}

export async function cancelAppointment(id: string): Promise<void> {
  // Jede Terminaenderung entwertet ALLE Zeitraeume — siehe vergessenMitPraefix.
  vergessenMitPraefix('termine:');
  const res = await fetch(`${API_BASE_URL}${APPT_PATH}/${id}/cancel`, {
    credentials: 'include',
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error('Termin konnte nicht abgesagt werden');
}

/** Termin endgültig löschen (kein Soft-Cancel, keine Kundenmail). */
export async function deleteAppointment(id: string): Promise<void> {
  // Jede Terminaenderung entwertet ALLE Zeitraeume — siehe vergessenMitPraefix.
  vergessenMitPraefix('termine:');
  const res = await fetch(`${API_BASE_URL}${APPT_PATH}/${id}?hard=true`, {
    credentials: 'include',
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Termin konnte nicht gelöscht werden');
}
