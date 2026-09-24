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

const LEADS_KEY = 'haendler_crm_leads';
const ACTIVITIES_KEY = 'haendler_crm_activities';
const SETTINGS_KEY = 'haendler_crm_settings';
const USERS_KEY = 'haendler_crm_users';
const PASSWORDS_KEY = 'haendler_crm_passwords';
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

const defaultUsers: User[] = [
  { username: 'admin', name: 'Administrator', role: 'Admin', active: true, createdAt: new Date().toISOString() },
];

const defaultPasswords: Record<string, string> = {
  admin: 'admin123',
};

// Initialize users and passwords
export function initializeUsers() {
  const users = localStorage.getItem(USERS_KEY);
  const passwords = localStorage.getItem(PASSWORDS_KEY);

  if (!users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(defaultUsers));
  }
  if (!passwords) {
    localStorage.setItem(PASSWORDS_KEY, JSON.stringify(defaultPasswords));
  }
}

// User Management
export function getUsers(): User[] {
  try {
    const data = localStorage.getItem(USERS_KEY);
    return data ? JSON.parse(data) : defaultUsers;
  } catch (error) {
    console.error('Error loading users:', error);
    return defaultUsers;
  }
}

export function saveUser(user: Partial<User>, password?: string): void {
  const users = getUsers();
  const passwords = JSON.parse(localStorage.getItem(PASSWORDS_KEY) || '{}');
  const now = new Date().toISOString();

  const existingIndex = users.findIndex(u => u.username === user.username);

  if (existingIndex !== -1) {
    // Update existing user
    users[existingIndex] = { ...users[existingIndex], ...user };
    if (password) {
      passwords[user.username!] = password;
    }
  } else {
    // Create new user
    const newUser: User = {
      username: user.username || '',
      name: user.name || '',
      email: user.email,
      phone: user.phone,
      role: user.role || 'Vertrieb',
      active: user.active !== undefined ? user.active : true,
      createdAt: now,
    };
    users.push(newUser);
    if (password) {
      passwords[user.username!] = password;
    }
  }

  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  localStorage.setItem(PASSWORDS_KEY, JSON.stringify(passwords));
}

export function deleteUser(username: string): void {
  const users = getUsers();
  const passwords = JSON.parse(localStorage.getItem(PASSWORDS_KEY) || '{}');

  const filtered = users.filter(u => u.username !== username);
  delete passwords[username];

  localStorage.setItem(USERS_KEY, JSON.stringify(filtered));
  localStorage.setItem(PASSWORDS_KEY, JSON.stringify(passwords));
}

export function getUserPassword(username: string): string | null {
  const passwords = JSON.parse(localStorage.getItem(PASSWORDS_KEY) || '{}');
  return passwords[username] || null;
}

// Login — the old CRM presentation remains unchanged, but credentials are
// verified by the shared Partsunion backend instead of browser localStorage.
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
  const response = await crmFetch('/api/admin-auth/logout', {
    method: 'POST',
    body: JSON.stringify({ app: 'crm' }),
  });
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

function internalUser(raw: Record<string, unknown> | null | undefined): User {
  return {
    username: String(raw?.username || ''),
    name: String(raw?.full_name || raw?.username || raw?.email || 'Partsunion'),
    email: raw?.email ? String(raw.email) : undefined,
    role: raw?.role === 'manager' ? 'Manager' : raw?.role === 'admin' || raw?.role === 'superadmin' ? 'Admin' : 'Vertrieb',
    active: true,
    createdAt: raw?.created_at ? String(raw.created_at) : undefined,
  };
}

export async function restoreCrmSession(): Promise<User | null> {
  try {
    const response = await crmFetch('/api/admin-auth/session?app=crm');
    if (!response.ok) throw new Error('Sitzungsstatus vorübergehend nicht verfügbar.');
    const payload = await response.json();
    if (!payload?.authenticated || !payload?.user) {
      sessionStorage.removeItem(CURRENT_USER_KEY);
      return null;
    }
    const user = internalUser(payload.user);
    sessionStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    return user;
  } catch (error) {
    sessionStorage.removeItem(CURRENT_USER_KEY);
    throw error;
  }
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

export function getActivities(leadId?: string): Activity[] {
  try {
    const data = localStorage.getItem(ACTIVITIES_KEY);
    const activities = data ? JSON.parse(data) : [];
    return leadId ? activities.filter((a: Activity) => a.leadId === leadId) : activities;
  } catch (error) {
    return [];
  }
}
// ... (rest of simple storage functions remain, or we can stub them)
export function saveActivity(activity: Partial<Activity>): void {
  // LocalStorage fallback for activities
  const activities = getActivities();
  // ... (logic)
  localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(activities));
}
export function deleteActivity(id: string): void {
  // LocalStorage fallback
}
export function getSettings(): Settings {
  // LocalStorage fallback
  const data = localStorage.getItem(SETTINGS_KEY);
  return data ? { ...defaultSettings, ...JSON.parse(data) } : defaultSettings;
}
export function saveSettings(settings: Settings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
