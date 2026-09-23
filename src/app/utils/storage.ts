export interface User {
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
  source: string;
  value?: number;
  priority?: string;
  assignedTo?: string;
  notes?: string;
  tags: string[];
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
  nextFollowUpDate?: string;
  scrapedAt?: string;
  lastEvaluatedAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  lastModifiedBy?: string;
}

export interface Activity {
  id: string;
  leadId: string;
  type: 'note' | 'call' | 'email' | 'meeting' | 'task';
  title: string;
  description: string;
  date: string;
  completed: boolean;
  createdBy: string;
  createdAt: string;
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
  id: string;
  name: string;
  color: string;
  order: number;
  probability: number;
  isActive: boolean;
}

const CURRENT_USER_KEY = 'partsunion_crm_current_user';

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
  companyName: 'PartsUnion CRM',
  currency: 'EUR',
  statuses: ['Neu', 'Kontaktiert', 'Qualifiziert', 'Angebot', 'Verhandlung', 'Gewonnen', 'Verloren'],
};

// Login
export async function login(username: string, password: string, totpCode?: string): Promise<User> {
  const response = await crmFetch('/api/admin-auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password, app: 'crm', ...(totpCode ? { totp_code: totpCode } : {}) }),
  });
  const payload = await response.json();
  if (!response.ok) {
    const error = new Error(payload?.error || payload?.message || 'Ungültige Anmeldedaten.') as Error & { code?: string };
    error.code = payload?.code;
    throw error;
  }
  const user = internalUser(payload.user);
  sessionStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  return user;
}

// Logout
export async function logout(): Promise<void> {
  const response = await crmFetch('/api/admin-auth/logout', { method: 'POST', body: JSON.stringify({ app: 'crm' }) });
  if (!response.ok) throw new Error('Abmeldung konnte nicht bestätigt werden.');
  sessionStorage.removeItem(CURRENT_USER_KEY);
}

// Get current user
export function getCurrentUser(): User | null {
  const user = sessionStorage.getItem(CURRENT_USER_KEY);
  return user ? JSON.parse(user) : null;
}

// Check if user is logged in
export function isLoggedIn(): boolean {
  return getCurrentUser() !== null;
}

function internalUser(raw: any): User {
  return {
    username: String(raw?.username || ''),
    name: String(raw?.full_name || raw?.name || raw?.username || raw?.email || 'Partsunion'),
    email: raw?.email ? String(raw.email) : undefined,
    role: raw?.role === 'manager' ? 'Manager' : 'Vertrieb',
    active: true,
    createdAt: raw?.created_at ? String(raw.created_at) : undefined,
  };
}

export async function restoreCrmSession(): Promise<User | null> {
  try {
    const response = await crmFetch('/api/admin-auth/me?app=crm');
    if (!response.ok) {
      sessionStorage.removeItem(CURRENT_USER_KEY);
      return null;
    }
    const user = internalUser(await response.json());
    sessionStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    return user;
  } catch {
    return null;
  }
}

// --------------------------------------------------------------------------
// API Integration - Website CRM Scraper Backend
// --------------------------------------------------------------------------

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://website-crm-scraper-backend-production.up.railway.app';

export function crmFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  headers.set('X-Partsunion-App', 'crm');
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  return fetch(`${API_BASE_URL}${path}`, { ...options, headers, credentials: 'include' });
}

export interface DemoRequest {
  id: string;
  crm_lead_id: string | null;
  status: string;
  vin_allowance: number;
  requested_at: string;
  access_sent_at: string | null;
  expires_at: string | null;
  follow_up_at: string | null;
}

export async function getDemoRequests(): Promise<DemoRequest[]> {
  const response = await crmFetch('/api/crm/demo-requests');
  if (!response.ok) throw new Error('Demo-Status konnte nicht geladen werden.');
  const payload = await response.json();
  return Array.isArray(payload.demo_requests) ? payload.demo_requests : [];
}

export async function requestDemo(input: {
  leadId: string;
  contactName: string;
  email?: string;
  phone?: string;
  followUpAt?: string;
  notes: string;
}): Promise<DemoRequest> {
  const response = await crmFetch('/api/crm/demo-requests', {
    method: 'POST',
    headers: { 'Idempotency-Key': `crm-demo:${crypto.randomUUID()}` },
    body: JSON.stringify(input),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error || 'Demo-Anfrage konnte nicht übergeben werden.');
  return payload.demo_request;
}

export async function getLeads(): Promise<Lead[]> {
  try {
    const res = await crmFetch('/api/crm/leads');
    if (!res.ok) throw new Error('Failed to fetch leads');
    return await res.json();
  } catch (error) {
    console.error('Error loading leads from API:', error);
    return [];
  }
}

export async function saveLead(lead: Partial<Lead>): Promise<void> {
  try {
    if (lead.id) {
      // Update existing lead
      const response = await crmFetch(`/api/crm/leads/${encodeURIComponent(lead.id)}`, {
        method: 'PATCH',
        body: JSON.stringify(lead)
      });
      if (!response.ok) throw new Error((await response.json())?.error || 'Lead konnte nicht gespeichert werden.');
    } else {
      // Create new lead
      const response = await crmFetch('/api/crm/leads/internal', {
        method: 'POST',
        body: JSON.stringify(lead)
      });
      if (!response.ok) throw new Error((await response.json())?.error || 'Lead konnte nicht erstellt werden.');
    }
  } catch (error) {
    console.error('Error saving lead:', error);
    throw error;
  }
}

export async function deleteLead(id: string): Promise<void> {
  try {
    const response = await crmFetch(`/api/crm/leads/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Lead konnte nicht archiviert werden.');
  } catch (error) {
    console.error('Error deleting lead:', error);
    throw error;
  }
}

// Scraper API Functions
export async function evaluateWebsite(url: string, niche?: string, companyName?: string, city?: string): Promise<unknown> {
  try {
    const res = await crmFetch('/api/scraper/evaluate', {
      method: 'POST',
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
    const res = await crmFetch('/api/scraper/start', {
      method: 'POST',
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
    const res = await crmFetch(`/api/scraper/status/${encodeURIComponent(jobId)}`);
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
    const res = await crmFetch('/api/scraper/radius-search', {
      method: 'POST',
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

// Dummy/LocalStorage implementation for Activities/Settings for now to avoid breaking too much
// We can migrate them later.

export async function getActivities(leadId: string): Promise<Activity[]> {
  const response = await crmFetch(`/api/crm/leads/${encodeURIComponent(leadId)}/activities`);
  if (!response.ok) throw new Error('Aktivitäten konnten nicht geladen werden.');
  const rows = await response.json();
  if (!Array.isArray(rows)) return [];
  return rows.map((row: any) => {
    const body = String(row.body || '');
    const [firstLine, ...rest] = body.split('\n');
    return {
      id: String(row.id), leadId: String(row.leadId || leadId),
      type: ['note', 'call', 'email', 'meeting', 'task'].includes(row.type) ? row.type : 'note',
      title: firstLine || 'Aktivität', description: rest.join('\n'),
      date: String(row.createdAt || new Date().toISOString()).slice(0, 10),
      completed: Boolean(row.completed), createdBy: String(row.createdByName || 'Unbekannt'),
      createdAt: String(row.createdAt || new Date().toISOString()),
    } as Activity;
  });
}

export async function saveActivity(activity: Partial<Activity> & { leadId: string }): Promise<void> {
  const body = [activity.title?.trim(), activity.description?.trim()].filter(Boolean).join('\n');
  const response = await crmFetch(
    activity.id
      ? `/api/crm/leads/${encodeURIComponent(activity.leadId)}/activities/${encodeURIComponent(activity.id)}`
      : `/api/crm/leads/${encodeURIComponent(activity.leadId)}/activities`,
    { method: activity.id ? 'PATCH' : 'POST', body: JSON.stringify({ type: activity.type || 'note', body, completed: activity.completed ?? false }) },
  );
  if (!response.ok) throw new Error((await response.json())?.error || 'Aktivität konnte nicht gespeichert werden.');
}

export async function deleteActivity(leadId: string, id: string): Promise<void> {
  const response = await crmFetch(`/api/crm/leads/${encodeURIComponent(leadId)}/activities/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Aktivität konnte nicht gelöscht werden.');
}
let currentSettings: Settings = defaultSettings;

function normalizeSettings(value: unknown): Settings {
  const row = value && typeof value === 'object' && !Array.isArray(value) ? value as Partial<Settings> : {};
  return {
    ...defaultSettings,
    ...row,
    pipelineStages: Array.isArray(row.pipelineStages) ? row.pipelineStages : defaultSettings.pipelineStages,
    sources: Array.isArray(row.sources) ? row.sources : defaultSettings.sources,
    industries: Array.isArray(row.industries) ? row.industries : defaultSettings.industries,
    tags: Array.isArray(row.tags) ? row.tags : defaultSettings.tags,
    statuses: Array.isArray(row.statuses) ? row.statuses : defaultSettings.statuses,
  };
}

export async function loadCrmSettings(): Promise<Settings> {
  const response = await crmFetch('/api/crm/settings');
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error || 'CRM-Einstellungen konnten nicht geladen werden.');
  currentSettings = normalizeSettings(payload?.settings);
  return currentSettings;
}

export function getSettings(): Settings {
  return currentSettings;
}

export async function saveSettings(settings: Settings): Promise<void> {
  const response = await crmFetch('/api/crm/settings', {
    method: 'PUT',
    body: JSON.stringify({ settings }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error || 'CRM-Einstellungen konnten nicht gespeichert werden.');
  currentSettings = normalizeSettings(payload?.settings ?? settings);
}
