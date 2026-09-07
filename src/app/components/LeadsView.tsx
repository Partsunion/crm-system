import { useState, useEffect, useRef, useMemo } from 'react';
import { CallButton } from '../phone/PhoneUI';
import {
  Plus, Search, Filter, Trash2, Download, Mail, Phone, Upload, Globe,
  ArrowUp, ArrowDown, ChevronsUpDown, Table2, Columns3, X, Check, ChevronDown, ListPlus, Layers,
  UserPlus, CalendarClock, Copy, ContactRound, ListTodo, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { sendBrochureBatch } from '../utils/brochure';
import {
  getLeads, saveLead, getStatusOptions, type Lead,
  getLeadLists, createLeadList, deleteLeadList, addLeadsToList, removeLeadsFromList, type LeadList,
  enrichMissingContacts, getAppointmentAdmins, type AppointmentAdmin,
} from '../utils/storage';
import { defaultOpenStage } from '../utils/stages';
import { LoadError } from './LoadError';
import { LeadModal } from './LeadModal';
import { LeadBatchDialog, type LeadBatchOperation } from './LeadBatchDialog';
import { LeadMobileCard } from './LeadMobileCard';
import { LeadDetailModal } from './LeadDetailModal';
import { ImportModal, type ImportedRow } from './ImportModal';
import { DuplicatesModal } from './DuplicatesModal';
import { CustomSelect } from './CustomSelect';
import {
  Card, PageHeader, Button, IconButton, Badge, EmptyState, StatusSelect, PriorityPill,
  inputClass, statusColor, cn,
} from './ui-kit';
import { matchesQualitySnapshot, qualityOf, timestamp, localDayKey, type QualityFilter } from '../utils/leadQuality';
import { getCurrentUser } from '../utils/storage';
import { safeWebsiteUrl } from '../utils/safeUrl';
import { ARBEITSFLAECHE, KOPF_BEREICH, SPALTE_SCROLLT, VOLLE_HOEHE } from './dichte';
import { useWorkspaceTime } from '../utils/useWorkspaceTime';
import { useResultPage } from '../utils/useResultPage';
import { LeadQuickAdd as QuickAdd } from './LeadQuickAdd';

type SortField = 'company' | 'createdAt' | 'value' | 'updatedAt' | 'lastContact' | 'nextFollowUpDate';

/** Sortier-Schnellwahl in der Filterleiste (Label → Feld + Richtung). */
const SORT_PRESETS: { label: string; field: SortField; dir: 'asc' | 'desc' }[] = [
  { label: 'Nächste Wiedervorlage', field: 'nextFollowUpDate', dir: 'asc' },
  { label: 'Zuletzt aktualisiert', field: 'updatedAt', dir: 'desc' },
  { label: 'Neueste zuerst', field: 'createdAt', dir: 'desc' },
  { label: 'Lange kein Kontakt', field: 'lastContact', dir: 'asc' },
  { label: 'Kürzlich kontaktiert', field: 'lastContact', dir: 'desc' },
];

/** Letzter Protokoll-Kontakt als Timestamp; nie kontaktiert = 0 (→ „am längsten her"). */
const lastContactTime = (l: Lead): number => (l.lastContactDate ? new Date(l.lastContactDate).getTime() || 0 : 0);
const QUALITY_FILTERS: { value: QualityFilter; label: string }[] = [{ value: 'all', label: 'Alle Datenqualitäten' }, { value: 'complete', label: 'Basisdaten vollständig' }, { value: 'no_contact', label: 'Kontaktweg fehlt' }, { value: 'missing_person', label: 'Ansprechpartner fehlt' }, { value: 'no_next_step', label: 'Nächster Schritt fehlt' }, { value: 'stale', label: 'Seit 90 Tagen unverändert' }];
type SavedView = { name: string; search: string; status: string; priority: string; assignee: string; dealer: string; country: string; quality: QualityFilter; due: boolean; segment: string; sortField: SortField; sortDirection: 'asc' | 'desc' };
function viewStorageKey(): string { return `crm_saved_views:${getCurrentUser()?.id || getCurrentUser()?.username || 'unknown'}`; }
function readSavedViews(): SavedView[] { try { const rows = JSON.parse(localStorage.getItem(viewStorageKey()) || '[]'); return Array.isArray(rows) ? rows.filter((row) => typeof row?.name === 'string').slice(0, 20) : []; } catch { return []; } }

// Quellen-Ansichten (Filter über leadSource/source) — keine DB-Listen.
const SOURCE_SEGMENTS: { key: string; label: string; match: (l: Lead) => boolean }[] = [
  { key: 'all', label: 'Alle', match: () => true },
  { key: 'src:scraper', label: 'Scraping', match: (l) => l.leadSource === 'scraper' || /scraper/i.test(l.source || '') },
  { key: 'src:website', label: 'Website', match: (l) => /^website/i.test(l.source || '') },
  { key: 'src:meta', label: 'Meta', match: (l) => /(meta|whatsapp|instagram|facebook)/i.test(l.source || '') },
  { key: 'src:google', label: 'Google Ads', match: (l) => /google\s*ads|google-ads/i.test(l.source || '') },
];

const COUNTRY_LABELS: Record<string, string> = {
  DE: 'Deutschland', AT: 'Österreich', CH: 'Schweiz', FR: 'Frankreich', PL: 'Polen',
};
const countryCode = (value?: string): string => {
  const v = (value || '').trim().toLowerCase();
  if (!v) return '';
  if (v === 'de' || v.includes('deutsch')) return 'DE';
  if (v === 'at' || v.includes('österreich') || v.includes('oesterreich')) return 'AT';
  if (v === 'ch' || v.includes('schweiz') || v.includes('suisse')) return 'CH';
  if (v === 'fr' || v.includes('frank')) return 'FR';
  if (v === 'pl' || v.includes('polen') || v.includes('polska')) return 'PL';
  return v.toUpperCase();
};
const dealerLabel = (value?: Lead['dealerType']): string =>
  value === 'gebrauchtteile' || value === 'verwerter' ? 'Gebrauchtteile' : value === 'neuteile' ? 'Neuteile' : 'Nicht eingeordnet';

// CSV-Zelle: RFC-4180-Quoting + Schutz gegen Formel-Injection (CSV-Injection).
// Lead-Daten stammen z.T. aus dem Scraper (fremd-kontrollierbar); ein Feld, das mit
// = + - @ (oder Tab/CR) beginnt, könnte beim Öffnen in Excel/Sheets als Formel
// ausgeführt werden. Wir präfixen solche Werte mit einem Apostroph (neutralisiert die
// Formel) und quoten immer doppelt.
function csvCell(value: unknown): string {
  if (value === undefined || value === null) return '""';
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function LeadsView({
  pendingAction = null,
  onPendingHandled,
  pendingLeadId = null,
  onPendingLeadHandled,
}: {
  pendingAction?: 'new' | 'import' | null;
  onPendingHandled?: () => void;
  /** Lead-Maske direkt öffnen (Sprung aus Kalender/Tagesplan). */
  pendingLeadId?: string | null;
  onPendingLeadHandled?: () => void;
} = {}) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [lists, setLists] = useState<LeadList[]>([]);
  const [activeSeg, setActiveSeg] = useState<string>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [view, setView] = useState<'table' | 'board'>('table');
  const listScroll = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [assignedToFilter, setAssignedToFilter] = useState<string>('all');
  const [dealerTypeFilter, setDealerTypeFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [qualityFilter, setQualityFilter] = useState<QualityFilter>('all');
  const [savedViews, setSavedViews] = useState<SavedView[]>(readSavedViews);
  const [activeSavedView, setActiveSavedView] = useState('');
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [duplicatesOpen, setDuplicatesOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [enriching, setEnriching] = useState(false);
  // Echte Admin-Accounts (Fecat/Elias/Bardia/Aaron) für die Lead-Zuteilung —
  // NICHT die localStorage-„Benutzerverwaltung", sondern die Bot-Admins.
  const [admins, setAdmins] = useState<AppointmentAdmin[]>([]);
  // Wiedervorlage-Filter: nur Leads, deren Follow-up heute oder früher fällig ist.
  const [dueOnly, setDueOnly] = useState(false);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [batch, setBatch] = useState<{ operation: LeadBatchOperation; targets: Lead[] } | null>(null);
  // Ab 1280px öffnet die Lead-Maske als gedocktes Seitenpanel neben der Tabelle,
  // darunter als klassisches Modal.
  const [wideScreen, setWideScreen] = useState<boolean>(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1280px)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1280px)');
    const onChange = (e: MediaQueryListEvent) => setWideScreen(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  // Wurde die Stammdaten-Maske AUS dem Aktivitäten-Overlay geöffnet? → Zurück-Pfeil.
  const [editFromDetail, setEditFromDetail] = useState(false);

  const statuses = getStatusOptions();
  function selectSavedView(name: string) {
    setActiveSavedView(name);
    const saved = savedViews.find((item) => item.name === name);
    if (!saved) return;
    setSearchTerm(saved.search); setStatusFilter(saved.status); setPriorityFilter(saved.priority); setAssignedToFilter(saved.assignee);
    setDealerTypeFilter(saved.dealer); setCountryFilter(saved.country); setQualityFilter(saved.quality); setDueOnly(saved.due);
    setActiveSeg(saved.segment); setSortField(saved.sortField); setSortDirection(saved.sortDirection); setSelected(new Set());
  }
  function saveView() {
    const name = window.prompt('Name für diese persönliche Filteransicht', activeSavedView)?.trim();
    if (!name) return;
    const item: SavedView = { name, search: searchTerm, status: statusFilter, priority: priorityFilter, assignee: assignedToFilter, dealer: dealerTypeFilter, country: countryFilter, quality: qualityFilter, due: dueOnly, segment: activeSeg, sortField, sortDirection };
    const next = [...savedViews.filter((saved) => saved.name !== name), item].slice(-20);
    try { localStorage.setItem(viewStorageKey(), JSON.stringify(next)); setSavedViews(next); setActiveSavedView(name); toast.success('Persönliche Ansicht auf diesem Gerät gespeichert.'); }
    catch { toast.error('Der Browser erlaubt das Speichern der Ansicht nicht.'); }
  }
  function resetFilters() { setSearchTerm(''); setStatusFilter('all'); setPriorityFilter('all'); setAssignedToFilter('all'); setDealerTypeFilter('all'); setCountryFilter('all'); setQualityFilter('all'); setDueOnly(false); setActiveSeg('all'); setActiveSavedView(''); }

  useEffect(() => {
    loadLeads();
    loadLists();
    getAppointmentAdmins().then(setAdmins);
  }, []);

  useEffect(() => {
    if (!pendingAction) return;
    if (pendingAction === 'new') {
      setEditingLead(null);
      setEditFromDetail(false);
      setIsModalOpen(true);
    } else if (pendingAction === 'import') {
      setIsImportModalOpen(true);
    }
    onPendingHandled?.();
  }, [pendingAction, onPendingHandled]);

  // Sprung aus Kalender/Tagesplan: sobald die Leads geladen sind, die Maske des
  // gewünschten Leads öffnen.
  useEffect(() => {
    if (!pendingLeadId || leads.length === 0) return;
    const lead = leads.find((l) => l.id === pendingLeadId);
    if (lead) setDetailLead(lead);
    else toast.error('Lead zum Termin wurde nicht gefunden.');
    onPendingLeadHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingLeadId, leads]);

  const loadLeads = async () => {
    setLoading(true); setLoadError('');
    try { const data = await getLeads(); setLeads(data); return true; }
    catch (error) { setLoadError(error instanceof Error ? error.message : 'Leads konnten nicht geladen werden.'); return false; }
    finally { setLoading(false); }
  };
  const loadLists = async () => setLists(await getLeadLists());

  const handleSaveLead = async (lead: Partial<Lead>) => {
    await saveLead(lead);
    await loadLeads();
    setIsModalOpen(false);
    setEditingLead(null);
    setEditFromDetail(false);
    toast.success(lead.id ? 'Lead aktualisiert.' : 'Lead erstellt.');
  };

  const handleDeleteLead = (id: string) => {
    const lead = leads.find((item) => item.id === id);
    if (lead) setBatch({ operation: { kind: 'delete' }, targets: [lead] });
  };

  // CSV-Import: jede Zeile wird als echter Lead über die API angelegt (POST
  // /api/crm/leads). Es werden ALLE gemappten Spalten übernommen (Website, Ort,
  // Adresse, Notizen, Prio, Typ, Quelle) — nicht nur die vier Kernfelder. Dubletten
  // gegen die bereits geladenen Leads (gleiche Telefonnummer ODER Firma+Ort) werden
  // übersprungen statt doppelt angelegt; pro Zeile wird ein Fehler gezählt, statt
  // den ganzen Import abzubrechen.
  const normPhone = (p?: string) => (p || '').replace(/\D/g, '').replace(/^0049/, '0').replace(/^49/, '0');
  const normName = (s?: string) => (s || '').toLowerCase().replace(/[^a-z0-9äöüß]/g, '');

  const handleImportLeads = async (rows: ImportedRow[]) => {
    let ok = 0;
    let skipped = 0;
    const errors: string[] = [];
    const seenPhones = new Set(leads.map((l) => normPhone(l.phone)).filter((p) => p.length > 5));
    const seenNames = new Set(leads.map((l) => `${normName(l.company)}|${normName(l.city)}`));
    // Prio aus Anruflisten (1–4) auf CRM-Prioritäten mappen; Textwerte durchreichen.
    const mapPriority = (p?: string): string | undefined => {
      const v = (p || '').trim();
      if (!v) return undefined;
      if (/^1$/.test(v)) return 'Hoch';
      if (/^2$/.test(v)) return 'Mittel';
      if (/^[34]$/.test(v)) return 'Niedrig';
      return v;
    };
    for (const row of rows) {
      const company = (row.company || '').trim();
      if (!company) { errors.push('Zeile ohne Firmenname übersprungen.'); continue; }
      const phoneKey = normPhone(row.phone);
      const nameKey = `${normName(company)}|${normName(row.city)}`;
      if ((phoneKey.length > 5 && seenPhones.has(phoneKey)) || seenNames.has(nameKey)) {
        skipped += 1;
        continue;
      }
      try {
        // Straße + PLZ in EIN Adressfeld (der Lead hat city separat).
        const address = [row.address, row.plz].filter(Boolean).join(', ');
        await saveLead({
          company,
          contactPerson: (row.contactPerson || '').trim(),
          email: (row.email || '').trim(),
          phone: (row.phone || '').trim() || undefined,
          website: (row.website || '').trim() || undefined,
          city: (row.city || '').trim() || undefined,
          region: (row.region || '').trim() || undefined,
          country: (row.country || '').trim() || undefined,
          address: address || undefined,
          notes: (row.notes || '').trim() || undefined,
          priority: mapPriority(row.priority),
          niche: (row.niche || '').trim() || undefined,
          tags: row.niche ? [row.niche.trim()] : undefined,
          status: (row.status || '').trim() || 'Neu',
          source: (row.source || '').trim() || 'CSV-Import',
        });
        ok += 1;
        if (phoneKey.length > 5) seenPhones.add(phoneKey);
        seenNames.add(nameKey);
      } catch (e: any) {
        errors.push(`„${company}": ${e?.message || 'Fehler'}`);
      }
    }
    await loadLeads();
    if (ok > 0) toast.success(`${ok} Lead(s) importiert${skipped > 0 ? `, ${skipped} übersprungen (bereits vorhanden)` : ''}.`);
    else if (skipped > 0) toast.success(`Nichts zu tun — alle ${skipped} Lead(s) sind bereits vorhanden.`);
    if (errors.length > 0) {
      toast.error(`${errors.length} Zeile(n) fehlgeschlagen.`);
      console.warn('Lead-Import-Fehler:', errors);
    }
  };

  // Bestands-Backfill: Leads mit Website aber ohne Telefonnummer über den Scraper
  // (Impressum/Kontaktseite) anreichern. Batchweise Schleife, bis der Server
  // remaining=0 meldet — mit Zwischenstand-Toasts, weil das je nach Bestand
  // mehrere Minuten crawlt. MAX_ROUNDS ist die Notbremse gegen Endlosschleifen.
  const handleEnrichMissing = async () => {
    if (enriching) return;
    setEnriching(true);
    const MAX_ROUNDS = 60;
    let phones = 0;
    let emails = 0;
    try {
      for (let round = 1; round <= MAX_ROUNDS; round++) {
        const r = await enrichMissingContacts(25);
        phones += r.phonesFound;
        emails += r.emailsFound;
        if (r.checked === 0 || r.remaining <= 0) break;
        toast.info(`Nummern nachziehen läuft… ${phones} gefunden, noch ${r.remaining} Lead(s) offen.`);
      }
      await loadLeads();
      toast.success(`Fertig: ${phones} Telefonnummer(n) und ${emails} E-Mail(s) ergänzt.`);
    } catch (e: any) {
      toast.error(e?.message || 'Anreicherung fehlgeschlagen.');
    } finally {
      setEnriching(false);
    }
  };

  const handleEditClick = (lead: Lead) => {
    setEditingLead(lead);
    setEditFromDetail(false);
    setIsModalOpen(true);
  };

  const changeStatus = async (lead: Lead, status: string) => {
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, status } : l)));
    try {
      await saveLead({ ...lead, status });
    } catch { setLeads((prev) => prev.map((l) => l.id === lead.id ? lead : l)); toast.error('Status wurde nicht gespeichert.'); }
  };

  const quickAdd = async (company: string, status = defaultOpenStage()) => {
    const c = company.trim();
    if (!c) return;
    await saveLead({ company: c, status, source: 'Manuell' });
    if (await loadLeads()) toast.success(`„${c}“ angelegt.`);
    else toast.warning('Lead wurde angelegt. Nur die Liste konnte nicht aktualisiert werden. Bitte neu laden, nicht erneut anlegen.');
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('desc'); }
  };

  // Benutzer-Filter: echte Admin-Accounts zuerst, dann evtl. Alt-Werte aus Leads,
  // die keinem Admin (mehr) entsprechen, plus „Nicht zugewiesen".
  const adminNames = admins.map((a) => a.username);
  const legacyAssignees = Array.from(new Set(leads.map((l) => l.assignedTo).filter(Boolean))).filter(
    (n) => !adminNames.includes(n as string),
  ) as string[];
  const assignedUsers = ['Alle Benutzer', ...adminNames, ...legacyAssignees, 'Nicht zugewiesen'];

  const workspaceTime = useWorkspaceTime();
  const today = localDayKey(new Date(workspaceTime));
  const dueIds = useMemo(() => new Set(leads.filter(lead => timestamp(lead.nextFollowUpDate) > 0 && lead.nextFollowUpDate!.slice(0, 10) <= today).map(lead => lead.id)), [leads, today]);
  const isDue = (lead: Lead): boolean => dueIds.has(lead.id);
  const dueCount = dueIds.size;
  const qualityIndex = useMemo(() => {
    return new Map(leads.map(lead => [lead.id, qualityOf(lead, workspaceTime)]));
  }, [leads, workspaceTime]);
  const qualityCounts = useMemo(() => {
    const result = { no_contact: 0, missing_person: 0, no_next_step: 0 };
    for (const quality of qualityIndex.values()) {
      if (!quality.contactable) result.no_contact++;
      if (quality.missing.includes('Ansprechpartner')) result.missing_person++;
      if (!quality.hasNextStep) result.no_next_step++;
    }
    return result;
  }, [qualityIndex]);

  // Segment-Match (Quelle ODER eigene Liste).
  const segMatch = useMemo(() => {
    if (activeSeg.startsWith('list:')) {
      const id = activeSeg.slice(5);
      return (l: Lead) => (l.listIds || []).includes(id);
    }
    const src = SOURCE_SEGMENTS.find((s) => s.key === activeSeg) || SOURCE_SEGMENTS[0];
    return src.match;
  }, [activeSeg]);

  const filteredLeads = useMemo(() => {
    const search = searchTerm.trim().toLocaleLowerCase('de');
    return leads
    .filter((lead) => {
      if (!segMatch(lead) || !matchesQualitySnapshot(qualityIndex.get(lead.id)!, qualityFilter)) return false;
      const matchesSearch =
        [lead.company, lead.contactPerson, lead.email, lead.phone].some(value => value?.toLocaleLowerCase('de').includes(search));
      const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || lead.priority === priorityFilter;
      const matchesAssignedTo =
        assignedToFilter === 'all' ||
        (assignedToFilter === 'Nicht zugewiesen' ? !lead.assignedTo : lead.assignedTo === assignedToFilter);
      const matchesDealerType = dealerTypeFilter === 'all'
        || (dealerTypeFilter === 'unclassified' && !lead.dealerType)
        || (dealerTypeFilter === 'gebrauchtteile'
          ? lead.dealerType === 'gebrauchtteile' || lead.dealerType === 'verwerter'
          : lead.dealerType === dealerTypeFilter);
      const matchesCountry = countryFilter === 'all' || countryCode(lead.country) === countryFilter;
      const matchesDue = !dueOnly || dueIds.has(lead.id);
      return matchesSearch && matchesStatus && matchesPriority && matchesAssignedTo
        && matchesDealerType && matchesCountry && matchesDue;
    })
    .sort((a, b) => {
      let c = 0;
      if (sortField === 'company') c = a.company.localeCompare(b.company);
      else if (sortField === 'createdAt') c = timestamp(a.createdAt) - timestamp(b.createdAt);
      else if (sortField === 'updatedAt') c = timestamp(a.updatedAt || a.createdAt) - timestamp(b.updatedAt || b.createdAt);
      else if (sortField === 'value') c = (a.value || 0) - (b.value || 0);
      else if (sortField === 'nextFollowUpDate') c = (timestamp(a.nextFollowUpDate) || Number.MAX_SAFE_INTEGER) - (timestamp(b.nextFollowUpDate) || Number.MAX_SAFE_INTEGER);
      else if (sortField === 'lastContact') c = lastContactTime(a) - lastContactTime(b);
      return (sortDirection === 'asc' ? c : -c) || a.company.localeCompare(b.company, 'de') || a.id.localeCompare(b.id);
    });
  }, [leads, segMatch, qualityIndex, qualityFilter, searchTerm, statusFilter, priorityFilter, assignedToFilter, dealerTypeFilter, countryFilter, dueOnly, dueIds, sortField, sortDirection]);
  const pagination = useResultPage(filteredLeads, JSON.stringify([searchTerm, activeSeg, qualityFilter, statusFilter, priorityFilter, assignedToFilter, dealerTypeFilter, countryFilter, dueOnly, sortField, sortDirection]));

  // Segment-Counts (über alle Leads).
  const segCount = (key: string): number => {
    if (key.startsWith('list:')) { const id = key.slice(5); return leads.filter((l) => (l.listIds || []).includes(id)).length; }
    const s = SOURCE_SEGMENTS.find((x) => x.key === key); return s ? leads.filter(s.match).length : 0;
  };

  // ── Selection ──
  // Bei gedocktem Lead-Panel wird die Tabelle schmal → nur Kernspalten zeigen
  // (Firma/Status/Letzter Kontakt), damit KEIN horizontaler Scroll entsteht.
  const compact = wideScreen && !!detailLead;
  const visibleIds = pagination.rows.map((l) => l.id);
  const filteredRealIds = filteredLeads.filter(lead => !lead.id.startsWith('tmp-')).map(lead => lead.id);
  const allFilteredSelected = filteredRealIds.length > 0 && filteredRealIds.every(id => selected.has(id));
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const toggleOne = (id: string) => setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleAllVisible = () => setSelected((prev) => {
    const n = new Set(prev);
    if (allVisibleSelected) visibleIds.forEach((id) => n.delete(id));
    else visibleIds.forEach((id) => n.add(id));
    return n;
  });
  const clearSelection = () => setSelected(new Set());
  const selectedRealIds = [...selected].filter((id) => !id.startsWith('tmp-'));

  const assignToList = async (listId: string) => {
    if (!selectedRealIds.length) return;
    try {
      await addLeadsToList(listId, selectedRealIds);
      toast.success(`${selectedRealIds.length} Lead(s) zur Liste hinzugefügt.`);
      clearSelection();
      await Promise.all([loadLeads(), loadLists()]);
    } catch (e: any) { toast.error(e.message || 'Zuordnung fehlgeschlagen'); }
  };
  const createAndAssign = async (name: string) => {
    try {
      const list = await createLeadList(name);
      if (list) { await loadLists(); if (selectedRealIds.length) await assignToList(list.id); else { toast.success(`Liste „${name}" erstellt.`); } }
    } catch (e: any) { toast.error(e.message || 'Liste konnte nicht erstellt werden'); }
  };
  const removeFromCurrentList = async () => {
    if (!activeSeg.startsWith('list:') || !selectedRealIds.length) return;
    const id = activeSeg.slice(5);
    try {
      await removeLeadsFromList(id, selectedRealIds);
      toast.success(`${selectedRealIds.length} Lead(s) aus der Liste entfernt.`);
      clearSelection();
      await Promise.all([loadLeads(), loadLists()]);
    } catch (e: any) { toast.error(e.message || 'Entfernen fehlgeschlagen'); }
  };
  // Bulk-Zuteilung: ausgewählte Leads einem echten Admin-Account zuweisen
  // (username=null → Zuweisung entfernen). PATCH pro Lead schreibt NUR assignedTo
  // (Metadata-Merge im Backend — kein Klobbern anderer Felder).
  const bulkAssignUser = (username: string | null) => {
    const targets = leads.filter((lead) => selectedRealIds.includes(lead.id));
    if (targets.length) setBatch({ operation: { kind: 'assign', username }, targets });
  };

  /**
   * Broschüre an die ausgewählten Leads.
   *
   * Bewusst mit Rückfrage und Zahlen: ein Sammelversand an die falsche Auswahl
   * lässt sich nicht zurückholen. Genannt wird auch, wie viele Leads gar keine
   * Adresse haben — sonst wundert man sich hinterher über die Differenz.
   */
  const [brochureBusy, setBrochureBusy] = useState(false);
  const sendBrochures = async () => {
    const ziel = leads.filter((l) => selected.has(l.id));
    if (!ziel.length) return;
    const frage = `E-Mail-Adresse bei ${ziel.length} Lead(s) prüfen und die Broschüre senden?`
      + '\n\nNeben dem E-Mail-Feld werden auch Lead-Notizen und Protokolle geprüft.'
      + '\n\nNur an Empfänger senden, die nach Unterlagen gefragt haben.';
    if (!confirm(frage)) return;

    setBrochureBusy(true);
    const toastId = toast.loading(`Prüfe und sende 0/${ziel.length}…`);
    try {
      const r = await sendBrochureBatch(ziel, (fertig, gesamt) => {
        toast.loading(`Sende ${fertig}/${gesamt}…`, { id: toastId });
      });
      if (r.fehler.length === 0) {
        toast.success(`${r.gesendet} Broschüre(n) versendet.`, { id: toastId });
      } else {
        toast.error(
          `${r.gesendet} versendet, ${r.fehler.length} fehlgeschlagen: `
          + r.fehler.slice(0, 3).map((f) => f.lead).join(', ')
          + (r.fehler.length > 3 ? ' …' : ''),
          { id: toastId, duration: 10000 },
        );
      }
      clearSelection();
      await loadLeads();
    } catch (e: any) {
      toast.error(e?.message || 'Versand fehlgeschlagen', { id: toastId });
    } finally {
      setBrochureBusy(false);
    }
  };

  const bulkDelete = () => {
    const targets = leads.filter((lead) => selectedRealIds.includes(lead.id));
    if (targets.length) setBatch({ operation: { kind: 'delete' }, targets });
  };
  const handleDeleteList = async (id: string, name: string) => {
    if (!confirm(`Liste „${name}" löschen? Die Leads selbst bleiben erhalten.`)) return;
    await deleteLeadList(id);
    if (activeSeg === `list:${id}`) setActiveSeg('all');
    await Promise.all([loadLists(), loadLeads()]);
    toast.success(`Liste „${name}" gelöscht.`);
  };

  // CSV-Export der aktuell gefilterten Leads (rein client-seitig, kein Backend).
  // Exportiert genau die sichtbare Auswahl (Segment + Suche + Filter), damit der
  // Export der Ansicht entspricht.
  const exportCsv = () => {
    if (filteredLeads.length === 0) {
      toast.error('Keine Leads zum Exportieren.');
      return;
    }
    const cols: { header: string; value: (l: Lead) => string | number | undefined }[] = [
      { header: 'Firma', value: (l) => l.company },
      { header: 'Kontakt', value: (l) => l.contactPerson },
      { header: 'E-Mail', value: (l) => l.email },
      { header: 'Telefon', value: (l) => l.phone },
      { header: 'Website', value: (l) => l.website || l.websiteUrl },
      { header: 'Branche', value: (l) => l.industry || l.niche },
      { header: 'Stadt', value: (l) => l.city },
      { header: 'Region', value: (l) => l.region },
      { header: 'Land', value: (l) => l.country },
      { header: 'Händlerart', value: (l) => dealerLabel(l.dealerType) },
      { header: 'Status', value: (l) => l.status },
      { header: 'Quelle', value: (l) => l.source },
      { header: 'Priorität', value: (l) => l.priority },
      { header: 'Wert', value: (l) => l.value },
      { header: 'Basisdaten vorhanden', value: (l) => `${qualityOf(l).complete}/6` },
      { header: 'Fehlende Daten', value: (l) => qualityOf(l).missing.join(', ') },
      { header: 'Zugewiesen', value: (l) => l.assignedTo },
      { header: 'Erstellt', value: (l) => l.createdAt },
      { header: 'Aktualisiert', value: (l) => l.updatedAt },
    ];
    const csv = [
      cols.map((c) => csvCell(c.header)).join(','),
      ...filteredLeads.map((l) => cols.map((c) => csvCell(c.value(l))).join(',')),
    ].join('\r\n');
    // BOM → Excel erkennt UTF-8 (Umlaute korrekt).
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success(`${filteredLeads.length} Lead(s) als CSV exportiert.`);
  };

  const formatRelativeTime = (date: string) => {
    const seconds = Math.floor((workspaceTime - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'Gerade eben';
    if (seconds < 3600) return `vor ${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `vor ${Math.floor(seconds / 3600)}h`;
    if (seconds < 604800) return `vor ${Math.floor(seconds / 86400)}d`;
    return new Date(date).toLocaleDateString('de-DE');
  };
  const activeFilters = [
    ...(dueOnly ? [{ label: 'Fällige Wiedervorlagen', clear: () => setDueOnly(false) }] : []),
    ...(qualityFilter !== 'all' ? [{ label: QUALITY_FILTERS.find((item) => item.value === qualityFilter)?.label || qualityFilter, clear: () => setQualityFilter('all') }] : []),
    ...(statusFilter !== 'all' ? [{ label: statusFilter, clear: () => setStatusFilter('all') }] : []),
    ...(assignedToFilter !== 'all' ? [{ label: assignedToFilter, clear: () => setAssignedToFilter('all') }] : []),
    ...(priorityFilter !== 'all' ? [{ label: priorityFilter, clear: () => setPriorityFilter('all') }] : []),
    ...(dealerTypeFilter !== 'all' ? [{ label: dealerTypeFilter === 'unclassified' ? 'Noch einordnen' : dealerLabel(dealerTypeFilter as Lead['dealerType']), clear: () => setDealerTypeFilter('all') }] : []),
    ...(countryFilter !== 'all' ? [{ label: COUNTRY_LABELS[countryFilter], clear: () => setCountryFilter('all') }] : []),
    ...(activeSeg !== 'all' ? [{ label: lists.find((list) => 'list:' + list.id === activeSeg)?.name || SOURCE_SEGMENTS.find((item) => item.key === activeSeg)?.label || 'Liste', clear: () => setActiveSeg('all') }] : []),
  ];
  const activeFilterCount = activeFilters.length;

  const stripUrl = (u: string) => u.replace(/^https?:\/\//, '').replace(/\/$/, '');

  return (
    <div className={cn(VOLLE_HOEHE, 'crm-leads')}>
      {/* Kopf: bleibt stehen, ueber BEIDEN Spalten.
          Die Kennzahlen sind weiter unten in die Listenspalte gewandert und
          scrollen mit ihr weg — fest im Kopf kosteten sie rund 80 px, die auf
          einem 13-Zoll-Bildschirm der Arbeitsflaeche fehlen, und waehrend man
          einen Lead bearbeitet braucht man sie nicht.
          Der Titelblock steht dagegen bewusst HIER und nicht in der Spalte.
          Dort hatte er nur die Breite der Liste, die Knoepfe nahmen sie fast
          ganz ein, und der Untertitel stand mit einem Wort pro Zeile
          untereinander. Ueber die volle Breite passt alles in eine Zeile. */}
      <div className={cn(KOPF_BEREICH, 'mx-auto w-full max-w-[1620px] space-y-3.5')}>
      <PageHeader title="Leads" subtitle="Kontakte qualifizieren und den nächsten Schritt planen." actions={<>
        <details className="relative" open={toolsOpen} onToggle={(event) => setToolsOpen(event.currentTarget.open)}>
          <summary className="flex h-9 cursor-pointer list-none items-center gap-2 rounded-md border border-border-subtle bg-surface px-3 text-sm">Werkzeuge <ChevronDown className="size-4" /></summary>
          <div className="absolute left-0 z-40 mt-2 flex w-56 flex-col gap-1 rounded-md border border-border-subtle bg-surface p-2 shadow-modal sm:left-auto sm:right-0">
            <Button variant="ghost" onClick={() => { setToolsOpen(false); setIsImportModalOpen(true); }}><Upload className="size-4" />Importieren</Button>
            <Button variant="ghost" onClick={() => { setToolsOpen(false); exportCsv(); }}><Download className="size-4" />Ansicht exportieren</Button>
            <Button variant="ghost" onClick={() => { setToolsOpen(false); setDuplicatesOpen(true); }}><Copy className="size-4" />Dubletten prüfen</Button>
            <Button variant="ghost" onClick={handleEnrichMissing} disabled={enriching}><Phone className="size-4" />{enriching ? 'Nummern werden gesucht…' : 'Nummern nachziehen'}</Button>
          </div>
        </details>
        <Button onClick={() => { setEditingLead(null); setEditFromDetail(false); setIsModalOpen(true); }}><Plus className="size-4" />Neuer Lead</Button>
      </>} />
      <div className="crm-filter-bar border border-border-subtle bg-surface">
        <div className="flex flex-wrap items-center gap-2 p-3">
          <div className="relative min-w-48 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" /><input aria-label="Leads durchsuchen" placeholder="Firma, Kontakt oder E-Mail suchen" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className={cn(inputClass, 'h-9 pl-9')} /></div>
          <select aria-label="Gespeicherte Ansicht" className={cn(inputClass, 'w-full sm:w-48')} value={activeSavedView} onChange={(event) => selectSavedView(event.target.value)}><option value="">Persönliche Ansichten</option>{savedViews.map((saved) => <option key={saved.name} value={saved.name}>{saved.name}</option>)}</select>
          <Button variant="secondary" aria-expanded={filtersOpen} aria-controls="lead-filters" onClick={() => setFiltersOpen(!filtersOpen)}><Filter className="size-4" />Filter{activeFilterCount ? ' (' + activeFilterCount + ')' : ''}</Button>
          <Button variant={dueOnly ? 'primary' : 'ghost'} aria-pressed={dueOnly} onClick={() => setDueOnly(!dueOnly)}><CalendarClock className="size-4" />Fällig ({dueCount})</Button>
          <ViewToggle view={view} onChange={setView} />
        </div>
        {filtersOpen && <div id="lead-filters" className="space-y-3 border-t border-border-subtle p-3">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-1 text-sm text-text-secondary">Datenqualität<select aria-label="Datenqualität filtern" className={inputClass} value={qualityFilter} onChange={(event) => setQualityFilter(event.target.value as QualityFilter)}>{QUALITY_FILTERS.map((filter) => <option key={filter.value} value={filter.value}>{filter.label}</option>)}</select></label>
            <label className="space-y-1 text-sm text-text-secondary">Phase<CustomSelect className="w-full" value={statusFilter === 'all' ? 'Alle Phasen' : statusFilter} onChange={(value) => setStatusFilter(value === 'Alle Phasen' ? 'all' : value)} options={['Alle Phasen', ...statuses]} /></label>
            <label className="space-y-1 text-sm text-text-secondary">Zuständigkeit<CustomSelect className="w-full" value={assignedToFilter === 'all' ? 'Alle Benutzer' : assignedToFilter} onChange={(value) => setAssignedToFilter(value === 'Alle Benutzer' ? 'all' : value)} options={assignedUsers} /></label>
            <label className="space-y-1 text-sm text-text-secondary">Sortierung<CustomSelect className="w-full" value={SORT_PRESETS.find((option) => option.field === sortField && option.dir === sortDirection)?.label || 'Sortierung'} onChange={(value) => { const option = SORT_PRESETS.find((item) => item.label === value); if (option) { setSortField(option.field); setSortDirection(option.dir); } }} options={SORT_PRESETS.map((option) => option.label)} /></label>
            <label className="space-y-1 text-sm text-text-secondary">Händlerart<select className={inputClass} value={dealerTypeFilter} onChange={(event) => setDealerTypeFilter(event.target.value)}><option value="all">Alle Händlerarten</option><option value="neuteile">Neuteile</option><option value="gebrauchtteile">Gebrauchtteile</option><option value="unclassified">Noch einordnen</option></select></label>
            <label className="space-y-1 text-sm text-text-secondary">Land<select className={inputClass} value={countryFilter} onChange={(event) => setCountryFilter(event.target.value)}><option value="all">Alle Länder</option>{Object.entries(COUNTRY_LABELS).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
            <label className="space-y-1 text-sm text-text-secondary">Priorität<CustomSelect className="w-full" value={priorityFilter === 'all' ? 'Alle Prioritäten' : priorityFilter} onChange={(value) => setPriorityFilter(value === 'Alle Prioritäten' ? 'all' : value)} options={['Alle Prioritäten', 'Hoch', 'Mittel', 'Niedrig']} /></label>
          </div>
          <div><p className="mb-2 text-sm text-text-secondary">Quelle oder Liste</p><SegmentBar active={activeSeg} onSelect={(key) => { setActiveSeg(key); clearSelection(); }} lists={lists} segCount={segCount} onCreate={createAndAssign} onDeleteList={handleDeleteList} /></div>
          <div className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" onClick={saveView}>Als persönliche Ansicht speichern</Button><Button size="sm" variant="ghost" onClick={resetFilters}>Filter zurücksetzen</Button>{activeSavedView && <Button size="sm" variant="ghost" onClick={() => { const next = savedViews.filter((saved) => saved.name !== activeSavedView); try { localStorage.setItem(viewStorageKey(), JSON.stringify(next)); setSavedViews(next); setActiveSavedView(''); } catch { toast.error('Ansicht konnte nicht entfernt werden.'); } }}>Ansicht entfernen</Button>}</div>
        </div>}
        {activeFilterCount > 0 && !filtersOpen && <div className="flex flex-wrap items-center gap-2 border-t border-border-subtle px-3 py-2 text-sm text-text-secondary">{activeFilters.map((filter) => <button key={filter.label} onClick={filter.clear} className="inline-flex items-center gap-1.5 rounded-md border border-accent-500/20 bg-accent-500/10 px-2 py-1 text-accent-500">{filter.label}<X className="size-3" /><span className="sr-only">entfernen</span></button>)}<button onClick={resetFilters} className="px-2 py-1 text-xs text-text-muted hover:text-text-primary">Alle zurücksetzen</button></div>}
      </div>

      {loadError && <LoadError message={loadError} onRetry={() => void loadLeads()} />}
      {loading && <p role="status" className="py-2 text-sm text-text-muted">Leads werden geladen…</p>}
      {/* Bulk-Aktionsleiste */}
      {selectedRealIds.length > 0 && (
        <BulkBar
          count={selectedRealIds.length}
          lists={lists}
          admins={adminNames}
          onAssign={assignToList}
          onAssignUser={bulkAssignUser}
          onCreateAssign={createAndAssign}
          onRemoveFromList={activeSeg.startsWith('list:') ? removeFromCurrentList : undefined}
          onBrochure={sendBrochures}
          brochureBusy={brochureBusy}
          onDelete={bulkDelete}
          onClear={clearSelection}
        />
      )}

      </div>

      {/* Arbeitsfläche: Liste/Board links, Lead-Maske rechts daneben.
          Beide Spalten scrollen FUER SICH — die Seite selbst gar nicht mehr.
          Vorher scrollten Seite und Maske gleichzeitig, und wer in der Maske
          ans Ende kam, schob unversehens die Seite weiter. */}
      <div className={cn(ARBEITSFLAECHE, 'mx-auto w-full max-w-[1620px]')}>
        <div ref={listScroll} className={cn(SPALTE_SCROLLT, 'min-w-0 flex-1 space-y-3.5 pb-2 pt-3')}>
      {!loading && !loadError && <section aria-label="Datenqualität im gesamten Leadbestand" className="crm-quality-rail border border-border-subtle bg-surface p-3">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-xs font-semibold text-text-secondary">Datenpflege · gesamter Bestand</h2><span className="text-xs text-text-muted">Erfasste Angaben, keine externe Verifizierung</span></div>
        <div className="flex flex-wrap gap-2">{([
          { key: 'no_contact', label: 'Kontaktweg fehlt', icon: Phone, tone: 'text-status-danger' },
          { key: 'missing_person', label: 'Ansprechpartner fehlt', icon: ContactRound, tone: 'text-status-warning' },
          { key: 'no_next_step', label: 'Nächster Schritt fehlt', icon: ListTodo, tone: 'text-accent-500' },
        ] as const).map(({ key, label, icon: Icon, tone }) => <button key={key} aria-pressed={qualityFilter === key} onClick={() => setQualityFilter(qualityFilter === key ? 'all' : key)} className={cn('flex min-h-10 items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors', qualityFilter === key ? 'border-accent-500 bg-accent-500/10 text-accent-500' : 'border-border-subtle text-text-secondary hover:bg-elevated')}><Icon className={cn('size-4', tone)} aria-hidden />{label}<span className="ml-1 font-semibold tabular-nums">{qualityCounts[key]}</span></button>)}</div>
      </section>}
      <div className="flex items-center justify-between gap-3 px-1 py-2 text-sm text-text-muted"><span role="status" className="font-medium text-text-secondary">{loading ? 'Wird geladen…' : loadError ? 'Daten nicht verfügbar' : `${filteredLeads.length} von ${leads.length} Leads`}</span><span className="hidden text-xs sm:inline">Firma öffnen → Kontaktverlauf & nächste Schritte</span></div>

      {view === 'board' ? (
        <BoardView statuses={statuses} leads={filteredLeads} onOpen={setDetailLead} onQuickAdd={quickAdd} />
      ) : (
        <>
          {!loading && !loadError && filteredLeads.length > 0 && <nav aria-label="Lead-Ergebnisseiten" className="sticky top-0 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-border-subtle bg-surface px-3 py-2 shadow-sm">
            <span className="mr-auto text-xs font-medium tabular-nums text-text-secondary">{pagination.start + 1}–{pagination.end} von {filteredLeads.length}</span>
            <div className="flex flex-wrap items-center gap-2">
            <select aria-label="Leads pro Seite" className={cn(inputClass, 'h-9 w-auto text-xs')} value={pagination.size} onChange={event => { pagination.setSize(Number(event.target.value)); listScroll.current?.scrollTo?.({ top: 0 }); }}><option value={25}>25 pro Seite</option><option value={50}>50 pro Seite</option><option value={100}>100 pro Seite</option></select>
            <div className="flex shrink-0 items-center gap-1">
            <IconButton aria-label="Vorherige Lead-Seite" disabled={pagination.page === 1} onClick={() => { pagination.setPage(pagination.page - 1); listScroll.current?.scrollTo?.({ top: 0 }); }}><ChevronLeft className="size-4" /></IconButton>
            <span className="text-xs tabular-nums" aria-label={`Seite ${pagination.page} von ${pagination.pages}`}>{pagination.page} / {pagination.pages}</span>
            <IconButton aria-label="Nächste Lead-Seite" disabled={pagination.page === pagination.pages} onClick={() => { pagination.setPage(pagination.page + 1); listScroll.current?.scrollTo?.({ top: 0 }); }}><ChevronRight className="size-4" /></IconButton>
            </div>
            </div>
          </nav>}
          {selectedRealIds.length > 0 && <div className="flex flex-wrap items-center gap-2 rounded-lg border border-accent-500/20 bg-accent-500/10 px-3 py-2 text-xs text-text-secondary"><span>{selectedRealIds.length} Leads ausgewählt, auch auf anderen Seiten.</span>{!allFilteredSelected && <button className="font-semibold text-accent-500 hover:underline" onClick={() => setSelected(previous => new Set([...previous, ...filteredRealIds]))}>Alle {filteredRealIds.length} gefilterten Leads auswählen</button>}<button className="ml-auto text-text-muted hover:text-text-primary" onClick={clearSelection}>Auswahl aufheben</button></div>}
          <Card className="crm-table-surface hidden overflow-visible md:block">
            <div className="overflow-x-auto">
              <table className="crm-lead-table w-full text-sm" data-compact={compact}>
                <thead>
                  <tr className="border-b border-border-subtle bg-elevated/50">
                    <th className="w-10 px-3 py-2.5">
                      <CheckBox checked={allVisibleSelected} mixed={!allVisibleSelected && visibleIds.some(id => selected.has(id))} onChange={toggleAllVisible} ariaLabel="Alle Leads auf dieser Seite auswählen" />
                    </th>
                    <SortHead label="Firma" field="company" sortField={sortField} dir={sortDirection} onSort={handleSort} />
                    {!compact && <th className="label-technical px-3 py-2.5 text-left text-text-muted">Händler / Land</th>}
                    {!compact && <th className="label-technical px-3 py-2.5 text-left text-text-muted">Kontakt</th>}
                    {!compact && <th className="label-technical px-3 py-2.5 text-center text-text-muted">Datenqualität</th>}
                    <th className="label-technical px-3 py-2.5 text-left text-text-muted">Status</th>
                    {!compact && <th className="label-technical px-3 py-2.5 text-left text-text-muted">Priorität</th>}
                    {!compact && <th className="label-technical px-3 py-2.5 text-left text-text-muted">Zugewiesen</th>}
                    {!compact && <SortHead label="Quelle / Wert" field="value" sortField={sortField} dir={sortDirection} onSort={handleSort} />}
                    <SortHead label="Nächster Schritt" field="nextFollowUpDate" sortField={sortField} dir={sortDirection} onSort={handleSort} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {pagination.rows.map((lead) => {
                    const quality = qualityIndex.get(lead.id)!;
                    const website = safeWebsiteUrl(lead.website || lead.websiteUrl);
                    const isSel = selected.has(lead.id);
                    return (
                      <tr key={lead.id} onClick={() => setDetailLead(lead)}
                        className={cn(
                          'cursor-pointer transition-colors hover:bg-elevated',
                          isSel && 'bg-accent-500/5',
                          detailLead?.id === lead.id && 'bg-accent-500/10',
                        )}>
                        <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <CheckBox checked={isSel} onChange={() => toggleOne(lead.id)} ariaLabel={`${lead.company} auswählen`} />
                        </td>
                        <td className="max-w-[240px] px-3 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="flex size-9 flex-shrink-0 items-center justify-center rounded-md bg-accent-500/15 font-semibold text-accent-500">{lead.company[0]}</div>
                            <div className="min-w-0">
                              <button className="block max-w-full truncate text-left font-semibold text-text-primary hover:text-accent-500 focus-visible:underline" aria-label={`Lead ${lead.company} öffnen`} onClick={(event) => { event.stopPropagation(); setDetailLead(lead); }}>{lead.company}</button>
                              <div className="truncate text-xs text-text-muted">{lead.industry || lead.niche || lead.city || 'Keine Branche'}</div>
                              {website && (
                                <a href={website} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                                  className="mt-0.5 flex items-center gap-1 truncate text-xs text-text-secondary hover:text-accent-500">
                                  <Globe className="size-3 shrink-0" /><span className="truncate">{stripUrl(website)}</span>
                                </a>
                              )}
                            </div>
                          </div>
                        </td>
                        {!compact && (
                        <td className="px-3 py-2.5">
                          <Badge tone={lead.dealerType === 'gebrauchtteile' || lead.dealerType === 'verwerter' ? 'used' : lead.dealerType === 'neuteile' ? 'accent' : 'neutral'}>
                            {dealerLabel(lead.dealerType)}
                          </Badge>
                          <div className="mt-1.5 text-xs text-text-muted">
                            {COUNTRY_LABELS[countryCode(lead.country)] || lead.country || 'Land offen'}
                          </div>
                        </td>
                        )}
                        {!compact && (
                        <td className="max-w-[190px] px-3 py-2.5">
                          <div className="space-y-1">
                            {lead.contactPerson && <div className="truncate font-medium text-text-primary">{lead.contactPerson}</div>}
                            {lead.email && lead.email !== 'nicht gefunden' && (
                              <a href={`mailto:${lead.email}`} onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1 truncate text-xs text-text-secondary hover:text-accent-500">
                                <Mail className="size-3 shrink-0" /><span className="truncate">{lead.email}</span>
                              </a>
                            )}
                            {lead.phone && (
                              <CallButton lead={lead} compact />
                            )}
                          </div>
                        </td>
                        )}
                        {!compact && (
                        <td className="px-3 py-2.5 text-center">
                          <div className="flex flex-col items-center gap-1" title={quality.explanation}>
                            <Badge tone="neutral">{quality.complete}/{quality.total} erfasst</Badge>
                            <span className="max-w-36 text-xs text-text-muted">{quality.missing.length ? quality.missing.slice(0, 2).join(', ') + ' fehlt' : 'Basis vollständig'}</span>
                          </div>
                        </td>
                        )}
                        <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <StatusSelect value={lead.status} options={statuses} onChange={(s) => changeStatus(lead, s)} />
                        </td>
                        {!compact && <td className="px-3 py-2.5">{lead.priority ? <PriorityPill priority={lead.priority} /> : <span className="text-xs text-text-muted">—</span>}</td>}
                        {!compact && (
                        <td className="px-3 py-2.5">
                          {lead.assignedTo ? (
                            <span className="inline-flex max-w-[120px] items-center gap-1.5 text-sm text-text-primary">
                              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-500/20 text-[11px] font-semibold text-accent-500">
                                {lead.assignedTo.slice(0, 2).toUpperCase()}
                              </span>
                              <span className="truncate">{lead.assignedTo}</span>
                            </span>
                          ) : (
                            <span className="text-xs text-text-muted">—</span>
                          )}
                          {isDue(lead) && (
                            <div className="mt-1"><Badge tone="warning">Follow-up fällig</Badge></div>
                          )}
                        </td>
                        )}
                        {!compact && (
                        <td className="px-3 py-2.5">
                          <div className="font-medium text-text-primary">{lead.source}</div>
                          {lead.value && lead.value > 0 && <p className="mt-0.5 text-xs text-text-muted tabular-nums">€{lead.value.toLocaleString('de-DE')}</p>}
                        </td>
                        )}
                        <td className="max-w-[240px] px-3 py-2.5">
                          <p className={cn("mb-1 text-sm font-medium", isDue(lead) ? "text-status-warning" : "text-text-primary")}>{lead.nextFollowUpDate ? new Date(lead.nextFollowUpDate).toLocaleDateString("de-DE") : "Noch nicht geplant"}</p>
                          {lead.lastContactDate ? (
                            <div className="flex items-center gap-2 text-xs text-text-secondary">
                              <Phone className="size-3 shrink-0" /><span>{formatRelativeTime(lead.lastContactDate)}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-text-muted">Noch kein Kontakt</span>
                          )}
                          {lead.lastNote && (
                            <p
                              className="mt-1 line-clamp-2 whitespace-normal text-xs leading-snug text-text-muted"
                              title={`${lead.lastNoteBy ? lead.lastNoteBy + ': ' : ''}${lead.lastNote}`}
                            >
                              „{lead.lastNote}“
                            </p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!loading && !loadError && filteredLeads.length === 0 && (
                <EmptyState icon={<Search className="size-5" />} title="Keine Leads gefunden" description="Andere Ansicht/Filter wählen oder über den Lead-Scraper neue Leads ziehen." />
              )}
              <div className="border-t border-border-subtle px-4 py-2"><QuickAdd onAdd={(c) => quickAdd(c)} /></div>
            </div>
          </Card>

          {/* Mobile Cards */}
          <div className="space-y-3 md:hidden">
            {pagination.rows.map((lead) => <LeadMobileCard key={lead.id} lead={lead} selected={selected.has(lead.id)} statuses={statuses} due={isDue(lead)}
              onSelect={() => toggleOne(lead.id)} onOpen={() => setDetailLead(lead)} onEdit={() => handleEditClick(lead)} onDelete={() => handleDeleteLead(lead.id)} onStatus={(status) => void changeStatus(lead, status)} />)}
            {!loading && !loadError && filteredLeads.length === 0 && (
              <Card><EmptyState icon={<Search className="size-5" />} title="Keine Leads gefunden" description="Andere Ansicht/Filter wählen." /></Card>
            )}
          </div>
        </>
      )}
        </div>

        {/* Die Maske klebt nicht mehr, sie FUELLT ihre Spalte. Kleben hiess:
            die Seite scrollt, die Maske bleibt scheinbar stehen — und ihre
            Hoehe musste aus Kopfzeile und Klebeabstand errechnet werden. Jetzt
            ist sie einfach so hoch wie die Arbeitsflaeche, ohne jede
            Rechnung. */}
        {detailLead && !batch && wideScreen && (
          <aside className="flex min-h-0 w-[540px] shrink-0 flex-col xl:w-[600px] 2xl:w-[680px]">
            <LeadDetailModal
              key={detailLead.id}
              variant="panel"
              lead={detailLead}
              onClose={() => setDetailLead(null)}
              onEdit={(lead) => { setDetailLead(null); setEditingLead(lead); setEditFromDetail(true); setIsModalOpen(true); }}
              onLeadChanged={loadLeads}
              onDelete={() => handleDeleteLead(detailLead.id)}
            />
          </aside>
        )}
      </div>

      {isImportModalOpen && <ImportModal onClose={() => setIsImportModalOpen(false)} onImport={handleImportLeads} />}
      {duplicatesOpen && <DuplicatesModal onClose={() => setDuplicatesOpen(false)} onMerged={loadLeads} />}
      {batch && <LeadBatchDialog operation={batch.operation} targets={batch.targets} onClose={() => { setBatch(null); void loadLeads(); }} onResult={(outcomes) => {
        const successful = new Set(outcomes.filter((result) => result.ok).map((result) => result.item.id));
        const failed = outcomes.filter((result) => !result.ok).map((result) => result.item.id);
        setSelected((previous) => new Set([...previous].filter((id) => !successful.has(id)).concat(failed)));
        if (batch.operation.kind === 'delete') {
          setLeads((previous) => previous.filter((lead) => !successful.has(lead.id)));
          setDetailLead((previous) => previous && successful.has(previous.id) ? null : previous);
        } else {
          const username = batch.operation.username || '';
          setLeads((previous) => previous.map((lead) => successful.has(lead.id) ? { ...lead, assignedTo: username } : lead));
        }
      }} />}
      {isModalOpen && (
        <LeadModal
          lead={editingLead}
          onClose={() => { setIsModalOpen(false); setEditingLead(null); setEditFromDetail(false); }}
          onSave={handleSaveLead}
          onBack={editFromDetail && editingLead ? () => {
            const l = editingLead;
            setIsModalOpen(false);
            setEditingLead(null);
            setEditFromDetail(false);
            setDetailLead(l);
          } : undefined}
        />
      )}
      {/* Schmale Screens: klassisches Modal statt Seitenpanel */}
      {detailLead && !batch && !wideScreen && (
        <LeadDetailModal lead={detailLead} onClose={() => setDetailLead(null)}
          onEdit={(lead) => { setDetailLead(null); setEditingLead(lead); setEditFromDetail(true); setIsModalOpen(true); }}
          onLeadChanged={loadLeads}
          onDelete={() => handleDeleteLead(detailLead.id)} />
      )}
    </div>
  );
}

/* ── Checkbox ──────────────────────────────────────────────── */
function CheckBox({ checked, mixed = false, onChange, ariaLabel }: { checked: boolean; mixed?: boolean; onChange: () => void; ariaLabel?: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={mixed ? 'mixed' : checked}
      aria-label={ariaLabel}
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      className={cn(
        'flex size-[18px] shrink-0 items-center justify-center rounded border transition-colors',
        checked || mixed ? 'border-accent-500 bg-accent-500 text-white' : 'border-border-strong bg-canvas hover:border-accent-500',
      )}
    >
      {mixed ? <span aria-hidden className="h-0.5 w-2.5 bg-current" /> : checked && <Check className="size-3" strokeWidth={3} />}
    </button>
  );
}

/* ── Lead-Listen-Leiste (Quellen + eigene Listen) ──────────── */
function SegmentBar({
  active, onSelect, lists, segCount, onCreate, onDeleteList,
}: {
  active: string;
  onSelect: (key: string) => void;
  lists: LeadList[];
  segCount: (key: string) => number;
  onCreate: (name: string) => void;
  onDeleteList: (id: string, name: string) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const pill = (key: string, label: string, count: number, deletable?: { id: string; name: string }) => {
    const isActive = active === key;
    return (
      <div key={key} className={cn(
        'group inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors',
        isActive ? 'border-accent-500/40 bg-accent-500/15 text-accent-500' : 'border-border-subtle bg-surface text-text-secondary hover:border-border-strong hover:text-text-primary',
      )}>
        <button type="button" onClick={() => onSelect(key)} className="inline-flex items-center gap-1.5">
          {label}
          <span className={cn('rounded px-1 text-[10px] tabular-nums', isActive ? 'bg-accent-500/20 text-accent-500' : 'bg-elevated text-text-muted')}>{count}</span>
        </button>
        {deletable && (
          <button type="button" onClick={() => onDeleteList(deletable.id, deletable.name)} aria-label="Liste löschen"
            className="opacity-0 transition-opacity hover:text-status-danger group-hover:opacity-100">
            <X className="size-3" />
          </button>
        )}
      </div>
    );
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      {SOURCE_SEGMENTS.map((s) => pill(s.key, s.label, segCount(s.key)))}
      {lists.length > 0 && <span className="mx-1 h-5 w-px bg-border-subtle" aria-hidden />}
      {lists.map((l) => pill(`list:${l.id}`, l.name, segCount(`list:${l.id}`), { id: l.id, name: l.name }))}
      {creating ? (
        <div className="inline-flex items-center gap-1.5 rounded-md border border-accent-500/40 bg-surface px-2 py-1">
          <Layers className="size-3.5 text-text-muted" />
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && name.trim()) { onCreate(name.trim()); setName(''); setCreating(false); }
              if (e.key === 'Escape') { setName(''); setCreating(false); }
            }}
            placeholder="Listenname…" className="h-6 w-32 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none" />
          <IconButton className="size-6" onClick={() => { if (name.trim()) { onCreate(name.trim()); setName(''); setCreating(false); } }} aria-label="Erstellen"><Check className="size-3.5" /></IconButton>
        </div>
      ) : (
        <button type="button" onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-border-strong px-3 py-1.5 text-sm text-text-muted transition-colors hover:border-accent-500 hover:text-accent-500">
          <ListPlus className="size-3.5" /> Liste erstellen
        </button>
      )}
    </div>
  );
}

/* ── Bulk-Aktionsleiste ────────────────────────────────────── */
function BulkBar({
  count, lists, admins, onAssign, onAssignUser, onCreateAssign, onRemoveFromList, onBrochure, brochureBusy, onDelete, onClear,
}: {
  count: number;
  lists: LeadList[];
  admins: string[];
  onAssign: (listId: string) => void;
  onAssignUser: (username: string | null) => void;
  onCreateAssign: (name: string) => void;
  onRemoveFromList?: () => void;
  onBrochure: () => void;
  brochureBusy: boolean;
  onDelete: () => void;
  onClear: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-accent-500/30 bg-accent-500/10 px-4 py-2.5">
      <span className="text-sm font-medium text-text-primary">{count} ausgewählt</span>
      {/* Zuweisen an echten Admin-Account */}
      <div className="relative" ref={userRef}>
        <Button size="sm" onClick={() => setUserMenuOpen((o) => !o)}>
          <UserPlus className="size-4" /> Zuweisen an <ChevronDown className="size-3.5 opacity-70" />
        </Button>
        {userMenuOpen && (
          <div className="absolute z-50 mt-1 min-w-[200px] rounded-md border border-border-subtle bg-elevated p-1 shadow-modal">
            {admins.length === 0 && <p className="px-2 py-2 text-xs text-text-muted">Keine Admin-Accounts geladen.</p>}
            {admins.map((name) => (
              <button key={name} type="button" onClick={() => { onAssignUser(name); setUserMenuOpen(false); }}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-text-secondary transition-colors hover:bg-elevated-hover hover:text-text-primary">
                <span className="flex size-5 items-center justify-center rounded-full bg-accent-500/20 text-[10px] font-semibold text-accent-500">
                  {name.slice(0, 2).toUpperCase()}
                </span>
                {name}
              </button>
            ))}
            <div className="my-1 border-t border-border-subtle" />
            <button type="button" onClick={() => { onAssignUser(null); setUserMenuOpen(false); }}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-text-muted transition-colors hover:bg-elevated-hover hover:text-text-primary">
              <X className="size-3.5" /> Zuweisung entfernen
            </button>
          </div>
        )}
      </div>
      <div className="relative" ref={ref}>
        <Button size="sm" onClick={() => setMenuOpen((o) => !o)}>
          <ListPlus className="size-4" /> Zu Liste hinzufügen <ChevronDown className="size-3.5 opacity-70" />
        </Button>
        {menuOpen && (
          <div className="absolute z-50 mt-1 min-w-[220px] rounded-md border border-border-subtle bg-elevated p-1 shadow-modal">
            {lists.length === 0 && <p className="px-2 py-2 text-xs text-text-muted">Noch keine eigenen Listen.</p>}
            {lists.map((l) => (
              <button key={l.id} type="button" onClick={() => { onAssign(l.id); setMenuOpen(false); }}
                className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm text-text-secondary transition-colors hover:bg-elevated-hover hover:text-text-primary">
                <span className="inline-flex items-center gap-2"><Layers className="size-3.5 text-text-muted" />{l.name}</span>
                <span className="text-[10px] text-text-muted tabular-nums">{l.count}</span>
              </button>
            ))}
            <div className="my-1 border-t border-border-subtle" />
            <div className="flex items-center gap-1 px-1 py-1">
              <input value={newName} onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && newName.trim()) { onCreateAssign(newName.trim()); setNewName(''); setMenuOpen(false); } }}
                placeholder="Neue Liste…" className={cn(inputClass, 'h-8')} />
              <IconButton className="size-8" onClick={() => { if (newName.trim()) { onCreateAssign(newName.trim()); setNewName(''); setMenuOpen(false); } }} aria-label="Erstellen + zuordnen"><Plus className="size-4" /></IconButton>
            </div>
          </div>
        )}
      </div>
      {onRemoveFromList && (
        <Button size="sm" variant="outline" onClick={onRemoveFromList}><X className="size-4" /> Aus Liste entfernen</Button>
      )}
      <Button size="sm" variant="outline" onClick={onBrochure} disabled={brochureBusy}
        title="Nur an Empfänger senden, die nach Unterlagen gefragt haben (UWG §7)">
        <Mail className="size-4" /> {brochureBusy ? 'Sende…' : 'Broschüre senden'}
      </Button>
      <Button size="sm" variant="danger" onClick={onDelete}><Trash2 className="size-4" /> Löschen</Button>
      <button type="button" onClick={onClear} className="ml-auto text-sm text-text-muted hover:text-text-primary">Abwählen</button>
    </div>
  );
}

/* ── View toggle ──────────────────────────────────────────── */
function ViewToggle({ view, onChange }: { view: 'table' | 'board'; onChange: (v: 'table' | 'board') => void }) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-md border border-border-subtle bg-canvas p-0.5">
      {([['table', Table2, 'Tabelle'], ['board', Columns3, 'Board']] as const).map(([key, Icon, label]) => (
        <button key={key} type="button" onClick={() => onChange(key)}
          className={cn('inline-flex h-7 items-center gap-1.5 rounded px-2.5 text-xs font-medium transition-colors',
            view === key ? 'bg-elevated text-text-primary' : 'text-text-muted hover:text-text-secondary')}>
          <Icon className="size-3.5" />{label}
        </button>
      ))}
    </div>
  );
}

/* ── Board (Gruppen nach Status) ──────────────────────────── */
function BoardView({ statuses, leads, onOpen, onQuickAdd }: { statuses: string[]; leads: Lead[]; onOpen: (lead: Lead) => void; onQuickAdd: (company: string, status: string) => Promise<void>; }) {
  const groups = statuses.map((status) => ({ status, items: leads.filter((l) => l.status === status) }));
  return (
    <div className="space-y-4">
      {groups.map((g) => <BoardGroup key={g.status} status={g.status} items={g.items} onOpen={onOpen} onQuickAdd={onQuickAdd} />)}
    </div>
  );
}

function BoardGroup({ status, items, onOpen, onQuickAdd }: { status: string; items: Lead[]; onOpen: (lead: Lead) => void; onQuickAdd: (company: string, status: string) => Promise<void>; }) {
  const [collapsed, setCollapsed] = useState(false);
  const sum = items.reduce((s, l) => s + (l.value || 0), 0);
  const color = statusColor(status);
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border-subtle px-4 py-2.5">
        <span className="h-5 w-1.5 rounded-full" style={{ backgroundColor: color }} aria-hidden />
        <button onClick={() => setCollapsed((c) => !c)} className="text-sm font-semibold text-text-primary">{status}</button>
        <Badge tone="neutral">{items.length}</Badge>
        <span className="ml-auto text-xs text-text-muted tabular-nums">€{sum.toLocaleString('de-DE')}</span>
      </div>
      {!collapsed && (
        <div>
          {items.map((lead) => (
            <button key={lead.id} onClick={() => onOpen(lead)}
              className="flex w-full items-center gap-3 border-b border-border-subtle px-4 py-2.5 text-left transition-colors last:border-0 hover:bg-elevated">
              <span className="h-8 w-0.5 rounded-full" style={{ backgroundColor: color }} aria-hidden />
              <div className="flex size-8 flex-shrink-0 items-center justify-center rounded-md bg-accent-500/15 text-sm font-semibold text-accent-500">{lead.company[0]}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-text-primary">{lead.company}</div>
                <div
                  className="truncate text-xs text-text-muted"
                  title={lead.lastNote ? `${lead.lastNoteBy ? lead.lastNoteBy + ': ' : ''}${lead.lastNote}` : undefined}
                >
                  {lead.lastNote ? `„${lead.lastNote}“` : (lead.contactPerson || lead.email || '—')}
                </div>
              </div>
              {lead.priority && <PriorityPill priority={lead.priority} />}
              <span className="hidden w-24 text-right text-sm font-medium text-text-primary tabular-nums sm:block">€{(lead.value || 0).toLocaleString('de-DE')}</span>
            </button>
          ))}
          <div className="px-4 py-2"><QuickAdd onAdd={(c) => onQuickAdd(c, status)} placeholder={`+ Lead in „${status}"…`} /></div>
        </div>
      )}
    </Card>
  );
}

function SortHead({ label, field, sortField, dir, onSort }: { label: string; field: SortField; sortField: SortField; dir: 'asc' | 'desc'; onSort: (field: SortField) => void; }) {
  const active = sortField === field;
  return (
    <th className="px-3 py-2.5 text-left">
      <button type="button" onClick={() => onSort(field)} className="label-technical inline-flex items-center gap-1.5 text-text-muted transition-colors hover:text-text-secondary">
        {label}
        {active ? (dir === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />) : <ChevronsUpDown className="size-3 opacity-40" />}
      </button>
    </th>
  );
}
