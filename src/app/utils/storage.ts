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
const CURRENT_USER_KEY = 'haendler_crm_current_user';

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

// Login
export function login(username: string, password: string): User | null {
  initializeUsers();
  const users = getUsers();
  const passwords = JSON.parse(localStorage.getItem(PASSWORDS_KEY) || '{}');

  const user = users.find(u => u.username === username && u.active);
  if (user && passwords[username] === password) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    return user;
  }

  return null;
}

// Logout
export function logout() {
  localStorage.removeItem(CURRENT_USER_KEY);
}

// Get current user
export function getCurrentUser(): User | null {
  const user = localStorage.getItem(CURRENT_USER_KEY);
  return user ? JSON.parse(user) : null;
}

// Check if user is logged in
export function isLoggedIn(): boolean {
  return getCurrentUser() !== null;
}

// --------------------------------------------------------------------------
// API Integration - Website CRM Scraper Backend
// --------------------------------------------------------------------------

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://website-crm-scraper-backend-production.up.railway.app';

export async function getLeads(): Promise<Lead[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/leads`);
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
      await fetch(`${API_BASE_URL}/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead)
      });
    } else {
      // Create new lead
      await fetch(`${API_BASE_URL}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead)
      });
    }
  } catch (error) {
    console.error('Error saving lead:', error);
    throw error;
  }
}

export async function deleteLead(id: string): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/leads/${id}`, {
      method: 'DELETE',
    });
  } catch (error) {
    console.error('Error deleting lead:', error);
    throw error;
  }
}

// Scraper API Functions
export async function evaluateWebsite(url: string, niche?: string, companyName?: string, city?: string): Promise<unknown> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/scraper/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    const res = await fetch(`${API_BASE_URL}/api/scraper/status/${jobId}`);
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
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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