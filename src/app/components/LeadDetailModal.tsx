import { CallbackPlanner, useCallbackPlanner } from './CallbackPlanner';
import { VoiceDictation } from './VoiceDictation';
import { LoadError } from './LoadError';
import { leadCategory } from '../utils/stages';
import { safeWebsiteUrl } from '../utils/safeUrl';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { CallButton, CallHistory, ActiveCallNote } from '../phone/PhoneUI';
import { usePhone } from '../phone/context';
import {
  Mail, Phone, User, Calendar, Edit, Trash2, Globe, MapPin, Tag as TagIcon,
  MessageSquare, PhoneCall, Video, FileText, CheckCircle, Clock, Rocket,
  ArrowRight, UserCheck, Pencil, Send, Loader2, Briefcase, Star,
  CalendarClock, Plus, X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  type Lead, type Activity, type ActivityType,
  getActivities, createActivity, updateActivity, deleteActivity, getStatusOptions, getCurrentUser,
  getAppointments, updateAppointment, cancelAppointment, getAppointmentAdmins,
  saveLead, type Appointment, type AppointmentAdmin,
} from '../utils/storage';
import { LeadEmailComposer } from './LeadEmailComposer';
import {
  Modal, Button, IconButton, Badge, StatusBadge, PriorityPill, EmptyState, SectionLabel, inputClass, cn,
} from './ui-kit';
import { CustomSelect } from './CustomSelect';
import { mayLeaveWorkspace, useWorkspaceGuard } from '../utils/useWorkspaceGuard';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const ADMIN_DASHBOARD_URL = (
  (import.meta.env as Record<string, string | undefined>).VITE_ADMIN_DASHBOARD_URL || 'https://admin.partsunion.de'
).replace(/\/$/, '');

function buildOnboardingHandoffUrl(lead: Lead): string {
  const p = new URLSearchParams();
  const set = (k: string, v: string | number | undefined | null) => {
    if (v !== undefined && v !== null && String(v).trim() !== '') p.set(k, String(v));
  };
  set('name', lead.company);
  set('company', lead.company);
  set('email', lead.email);
  set('whatsapp', lead.whatsappNumber || lead.phone);
  set('city', lead.city);
  set('address', lead.address);
  set('seats', lead.seats);
  set('vat', lead.vatId);
  if (lead.smallBusiness) set('smallBusiness', '1');
  return `${ADMIN_DASHBOARD_URL}/tenants/new?${p.toString()}`;
}

interface LeadDetailModalProps {
  lead: Lead;
  onClose: () => void;
  onEdit: (lead: Lead) => void;
  onDelete: () => void;
  /** Navigation callback handles the workspace's unsaved-change guard. */
  onOpenCalendar?: (lead: Lead) => void;
  /** Wird nach Statuswechsel/Entscheider-Update aufgerufen, damit Liste/Pipeline neu lädt. */
  onLeadChanged?: () => void;
  /**
   * 'modal' (Default): klassisches Overlay.
   * 'panel': gedockte Seitenleiste RECHTS NEBEN der Lead-Tabelle — Liste bleibt
   * bedienbar, Zeilenklick wechselt den Lead im Panel (Remount via key).
   */
  variant?: 'modal' | 'panel';
  navigation?: { index: number; total: number; previous?: () => void; next?: () => void };
}

/** Gemeinsame Hülle: Overlay-Modal ODER gedocktes Seitenpanel. */
function Shell({
  suspended,
  variant,
  onClose,
  title,
  subtitle,
  headerAccessory,
  footer,
  children,
}: {
  suspended?: boolean;
  variant: 'modal' | 'panel';
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  headerAccessory?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  if (variant === 'panel') {
    return (
      <section
        className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border-subtle bg-surface shadow-lg"
        aria-label="Lead-Details"
      >
        <header className="flex items-center justify-between gap-2 border-b border-border-subtle px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-text-primary">{title}</h2>
            {subtitle ? <p className="truncate text-xs text-text-muted">{subtitle}</p> : null}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {headerAccessory}
            <IconButton onClick={onClose} aria-label="Schließen">
              <X className="size-4" />
            </IconButton>
          </div>
        </header>
        {/* overscroll-contain: ohne das scrollt der Browser am Ende der Maske
            einfach die Liste daneben weiter — genau das Durchrutschen, das
            sich „dynamisch" anfuehlte. */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4">{children}</div>
        {footer && <footer className="border-t border-border-subtle px-4 py-3">{footer}</footer>}
      </section>
    );
  }
  return (
    <Modal open={!suspended} onClose={onClose} size="xl" title={title} subtitle={subtitle} headerAccessory={headerAccessory} footer={footer} bodyClassName="space-y-4">
      {children}
    </Modal>
  );
}

const ACTIVITY_META: Record<ActivityType, { icon: React.ReactNode; cls: string; label: string }> = {
  call: { icon: <PhoneCall className="size-4" />, cls: 'bg-status-info/15 text-status-info', label: 'Anruf' },
  email: { icon: <Mail className="size-4" />, cls: 'bg-status-success/15 text-status-success', label: 'E-Mail' },
  meeting: { icon: <Video className="size-4" />, cls: 'bg-accent-500/15 text-accent-500', label: 'Meeting' },
  note: { icon: <FileText className="size-4" />, cls: 'bg-elevated text-text-secondary', label: 'Notiz' },
  task: { icon: <CheckCircle className="size-4" />, cls: 'bg-status-warning/15 text-status-warning', label: 'Aufgabe' },
  stage_change: { icon: <ArrowRight className="size-4" />, cls: 'bg-accent-500/15 text-accent-500', label: 'Statuswechsel' },
};

const LOG_TYPES: { type: ActivityType; label: string; icon: React.ReactNode }[] = [
  { type: 'call', label: 'Anruf', icon: <PhoneCall className="size-3.5" /> },
  { type: 'note', label: 'Notiz', icon: <FileText className="size-3.5" /> },
  { type: 'email', label: 'E-Mail', icon: <Mail className="size-3.5" /> },
  { type: 'meeting', label: 'Termin', icon: <Video className="size-3.5" /> },
  { type: 'task', label: 'Aufgabe', icon: <CheckCircle className="size-3.5" /> },
];

// ── Termin-Helfer (floating wall-clock, wie KalenderView) ────────────────────
const pad2 = (n: number) => String(n).padStart(2, '0');
const dateKey = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const timeOf = (iso: string) => { const m = iso.match(/T(\d{2}):(\d{2})/); return m ? `${m[1]}:${m[2]}` : ''; };
const WD_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

/** "2026-07-24T14:30" → "Fr, 24.07. · 14:30" (heute/morgen als Wort). */
function apptLabel(iso: string): string {
  const day = iso.slice(0, 10);
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 864e5);
  let dayLabel: string;
  if (day === dateKey(today)) dayLabel = 'Heute';
  else if (day === dateKey(tomorrow)) dayLabel = 'Morgen';
  else {
    const d = new Date(`${day}T00:00`);
    dayLabel = `${WD_SHORT[d.getDay()]}, ${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.`;
  }
  return `${dayLabel} · ${timeOf(iso)}`;
}

/** Termin liegt in der Vergangenheit (lokale Wall-Clock)? */
function isOverdue(iso: string): boolean {
  const now = new Date();
  return iso.slice(0, 16) < `${dateKey(now)}T${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
}

const CALL_TYPE_LABEL: Record<string, string> = { quali: 'Quali-Call', sales: 'Sales-Call', call: 'Rückruf', other: 'Termin' };

function relTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (!t) return '';
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return 'gerade eben';
  if (m < 60) return `vor ${m} Min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `vor ${h} Std`;
  const d = Math.floor(h / 24);
  if (d < 7) return `vor ${d} T`;
  return new Date(iso).toLocaleDateString('de-DE');
}

/** Exakter Zeitstempel „24.07.2026, 14:32 Uhr" aus dem echten Aktivitäts-Timestamp. */
function exactStamp(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' Uhr';
}

function initials(name: string): string {
  return (name || '?').split(/\s+/).map((s) => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
}

export function LeadDetailModal({ lead, onClose, onEdit, onDelete, onLeadChanged, onOpenCalendar, variant = 'modal', navigation }: LeadDetailModalProps) {
  const currentUser = getCurrentUser();
  const phone = usePhone();
  const hasCallNote = phone?.opened && phone.call?.leadId === lead.id && phone.call?.userId === currentUser?.id;
  const currentName = currentUser?.username || currentUser?.name || '';
  const isAdmin = currentUser?.role === 'manager' || Boolean(currentUser?.app_access?.admin);

  // Lokale Spiegel: aktualisieren sich sofort nach einer Aktivität (vor Parent-Reload).
  const [status, setStatus] = useState(lead.status);
  const [dmName, setDmName] = useState(lead.decisionMakerName || '');
  const [dmReached, setDmReached] = useState<boolean>(!!lead.reachedDecisionMaker);

  const [detailTab, setDetailTab] = useState<'activity' | 'next' | 'info'>('activity');
  const [activityError, setActivityError] = useState(false);
  const [appointmentError, setAppointmentError] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  // Composer
  const [logType, setLogType] = useState<ActivityType>('call');
  const [note, setNote] = useState('');
  const [reached, setReached] = useState<boolean | null>(null);
  const [dmInput, setDmInput] = useState('');
  const [moveTo, setMoveTo] = useState(lead.status);
  const [saving, setSaving] = useState(false);

  // Inline-Bearbeitung
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');

  const [emailOpen, setEmailOpen] = useState(false);
  const [emailState, setEmailState] = useState({dirty:false,busy:false});

  // ── Geplante Anrufe / Rückrufe (echte Termine, verknüpft über companyId) ──
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [admins, setAdmins] = useState<AppointmentAdmin[]>([]);
  const [planOpen, setPlanOpen] = useState(false);
  useWorkspaceGuard(Boolean(note.trim() || dmInput.trim() || reached !== null || moveTo !== status || editingId || emailState.dirty), saving || emailState.busy);

  const reload = useCallback(async () => {
    setLoading(true); setActivityError(false);
    try { setActivities(await getActivities(lead.id)); } catch { setActivityError(true); } finally { setLoading(false); }
  }, [lead.id]);

  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => { const refresh = () => void reload(); window.addEventListener('crm:call-updated', refresh); return () => window.removeEventListener('crm:call-updated', refresh); }, [reload]);

  const reloadAppts = useCallback(async () => {
    setAppointmentError(false);
    try {
      const rows = await getAppointments({ companyId: lead.id });
      setAppts(rows.filter((a) => a.status === 'proposed' || a.status === 'confirmed'));
    } catch { setAppointmentError(true); }
  }, [lead.id]);

  useEffect(() => { void reloadAppts(); }, [reloadAppts]);
  useEffect(() => { getAppointmentAdmins().then(setAdmins).catch(() => undefined); }, []);

  // Standard-Zuständiger = eingeloggter Nutzer (sobald Admins geladen sind).
  const myAdminId = useMemo(
    () => admins.find((a) => a.username?.toLowerCase() === (currentUser?.username || '').toLowerCase())?.id || '',
    [admins, currentUser],
  );
  const callbackPlanner = useCallbackPlanner({leadId:lead.id,assigneeId:myAdminId,enabled:planOpen,onSaved:()=>{void reloadAppts();onLeadChanged?.();}});

  const completeAppt = async (a: Appointment) => {
    try { await updateAppointment(a.id, { status: 'completed' }); await reloadAppts(); onLeadChanged?.(); toast.success('Als erledigt markiert.'); }
    catch (e: any) { toast.error(e.message || 'Fehlgeschlagen'); }
  };
  const removeAppt = async (a: Appointment) => {
    if (!confirm('Geplanten Anruf wirklich absagen?')) return;
    try { await cancelAppointment(a.id); await reloadAppts(); toast.success('Anruf abgesagt.'); }
    catch (e: any) { toast.error(e.message || 'Absagen fehlgeschlagen'); }
  };

  const stageChanged = !!moveTo && moveTo !== status;

  const handleLog = async () => {
    if (!note.trim() && !stageChanged && reached === null && !dmInput.trim()) {
      toast.error('Notiz schreiben, Entscheider erfassen oder Status ändern.');
      return;
    }
    setSaving(true);
    try {
      await createActivity(lead.id, {
        type: logType,
        body: note.trim() || undefined,
        reachedDecisionMaker: reached,
        decisionMakerName: dmInput.trim() || undefined,
        stageTo: stageChanged ? moveTo : undefined,
      });
      setNote(''); setReached(null); setDmInput('');
      if (stageChanged) setStatus(moveTo);
      if (reached === true) setDmReached(true);
      if (dmInput.trim()) setDmName(dmInput.trim());
      await reload();
      onLeadChanged?.();
      toast.success(stageChanged ? `Protokolliert · verschoben nach „${moveTo}"` : 'Protokolliert.');
    } catch (e: any) {
      toast.error(e.message || 'Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async (a: Activity) => {
    try {
      await updateActivity(lead.id, a.id, { body: editBody });
      setEditingId(null);
      await reload();
    } catch (e: any) { toast.error(e.message || 'Bearbeiten fehlgeschlagen'); }
  };

  const removeActivity = async (a: Activity) => {
    if (!confirm('Aktivität wirklich löschen?')) return;
    try { await deleteActivity(lead.id, a.id); await reload(); }
    catch (e: any) { toast.error(e.message || 'Löschen fehlgeschlagen'); }
  };

  const toggleTask = async (a: Activity) => {
    try { await updateActivity(lead.id, a.id, { completed: !a.completed }); await reload(); }
    catch (e: any) { toast.error(e.message || 'Fehlgeschlagen'); }
  };

  const canModify = (a: Activity) => isAdmin || (!!currentName && a.createdByName === currentName);

  return (
    <><Shell
      suspended={emailOpen}
      variant={variant}
      onClose={() => { if (mayLeaveWorkspace()) onClose(); }}
      title={lead.company}
      subtitle={lead.contactPerson}
      headerAccessory={
        <Button variant="secondary" size="sm" onClick={() => { if (mayLeaveWorkspace()) onEdit(lead); }}>
          <Edit className="size-4" />
          <span className="hidden sm:inline">Stammdaten</span>
        </Button>
      }
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => { if (mayLeaveWorkspace()) onDelete(); }}>
            <Trash2 className="size-4" />
            Löschen
          </Button>
          {navigation && <div className="ml-auto flex items-center gap-2" aria-label="Leads durchgehen">
            <span className="text-xs tabular-nums text-text-muted">{navigation.index >= 0 ? (navigation.index + 1) + ' / ' + navigation.total : 'Außerhalb des Filters'}</span>
            <IconButton aria-label="Vorheriger Lead" disabled={!navigation.previous || saving} onClick={navigation.previous}><ChevronLeft className="size-4"/></IconButton>
            <Button variant="secondary" size="sm" disabled={!navigation.next || saving} onClick={navigation.next}>Nächster Lead<ChevronRight className="size-4"/></Button>
          </div>}
          {currentUser?.app_access?.admin && leadCategory({ status }) === 'won' && (
            <button
              onClick={() => window.open(buildOnboardingHandoffUrl(lead), '_blank', 'noopener')}
              title="Öffnet den vorbefüllten Tenant-Wizard im Admin-Dashboard"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-status-success/15 px-3.5 text-sm font-medium text-status-success ring-1 ring-inset ring-status-success/30 transition-colors hover:bg-status-success/25"
            >
              <Rocket className="size-4" />
              In Onboarding übergeben
            </button>
          )}
        </div>
      }
    >
      {/* Status-Leiste */}
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={status} />
        {lead.priority && <PriorityPill priority={lead.priority} />}
        <Badge tone="neutral">{lead.contactPerson?.trim() ? 'Ansprechpartner erfasst' : 'Ansprechpartner fehlt'}</Badge>
        {dmReached && (
          <Badge tone="success">
            <UserCheck className="mr-1 inline size-3" />Entscheider{dmName ? `: ${dmName}` : ''}
          </Badge>
        )}
      </div>

          {(lead.phone || lead.email || onOpenCalendar) && (
            <div className="flex flex-wrap gap-2">
              {lead.phone && (
                <CallButton lead={lead} />
              )}
              {lead.email && (
                <button type="button" onClick={()=>setEmailOpen(true)} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md bg-elevated px-3 text-sm font-medium text-text-secondary ring-1 ring-inset ring-border-subtle transition-colors hover:text-text-primary">
                  <Mail className="size-4" />E-Mail
                </button>
              )}
              {onOpenCalendar && <Button variant="secondary" size="sm" onClick={() => onOpenCalendar(lead)}><Calendar className="size-4" /> Zum Kalender</Button>}
            </div>
          )}

      <nav aria-label="Leadbereich" className="flex gap-1 border-b border-border-subtle">{([{ id: 'activity', label: 'Aktivitäten' }, { id: 'next', label: 'Nächste Schritte' }, { id: 'info', label: 'Kontaktdaten' }] as const).map((tab) => <button type="button" key={tab.id} aria-pressed={detailTab === tab.id} onClick={() => setDetailTab(tab.id)} className={cn('border-b-2 px-3 py-3 text-sm font-medium', detailTab === tab.id ? 'border-accent-500 text-accent-500' : 'border-transparent text-text-secondary')}>{tab.label}</button>)}</nav>
      <div className="space-y-4">
        {/* ── Protokoll (Hauptbereich) — im Panel UNTER der Info-Karte ───── */}
        <div hidden={detailTab !== 'activity'} className="space-y-5">
          {/* Composer */}
          {hasCallNote && <ActiveCallNote />}
          <div hidden={Boolean(hasCallNote)} className="rounded-md border border-border-subtle bg-surface p-4"><h3 className="mb-3 text-sm font-semibold">Aktivität erfassen</h3>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {LOG_TYPES.map((t) => (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => setLogType(t.type)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium ring-1 ring-inset transition-colors',
                    logType === t.type
                      ? 'bg-accent-500 text-white ring-accent-500'
                      : 'bg-canvas text-text-secondary ring-border-subtle hover:text-text-primary',
                  )}
                >
                  {t.icon}{t.label}
                </button>
              ))}
            </div>

            <textarea
              aria-label="Gesprächsnotiz"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Wie lief das Gespräch? Was wurde besprochen, was sind die nächsten Schritte?…"
              className={cn(inputClass, 'resize-none py-2')}
            />

            <VoiceDictation leadId={lead.id} disabled={saving||Boolean(phone?.live)} onText={text=>setNote(previous=>previous.trim()?previous+"\n\n"+text:text)}/>

            {/* Entscheider */}
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-border-subtle bg-canvas/60 p-2.5">
              <button
                type="button"
                onClick={() => setReached(reached === true ? null : true)}
                className={cn('inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium ring-1 ring-inset transition-colors',
                  reached === true ? 'bg-status-success/15 text-status-success ring-status-success/30' : 'bg-canvas text-text-muted ring-border-subtle hover:text-text-primary')}
              >
                <UserCheck className="size-3.5" />Entscheider erreicht
              </button>
              <button
                type="button"
                onClick={() => setReached(reached === false ? null : false)}
                className={cn('inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium ring-1 ring-inset transition-colors',
                  reached === false ? 'bg-status-danger/15 text-status-danger ring-status-danger/30' : 'bg-canvas text-text-muted ring-border-subtle hover:text-text-primary')}
              >
                nicht erreicht
              </button>
              <input
                value={dmInput}
                onChange={(e) => setDmInput(e.target.value)}
                placeholder="Name des Entscheiders"
                className={cn(inputClass, 'h-9 min-w-[150px] flex-1')}
              />
            </div>

            {/* Status danach + senden */}
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <div className="min-w-[190px] flex-1">
                <SectionLabel className="mb-1.5 block">Status danach</SectionLabel>
                <CustomSelect value={moveTo} onChange={setMoveTo} options={getStatusOptions()} className="w-full" />
              </div>
              <Button onClick={handleLog} disabled={saving} className="h-10">
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                {stageChanged ? 'Speichern & verschieben' : 'Protokollieren'}
              </Button>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-3"><h3 className="text-sm font-semibold">Verlauf</h3>
            {activityError && <LoadError message="Aktivitäten konnten nicht geladen werden." onRetry={() => void reload()} />}
            {loading && (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-text-muted">
                <Loader2 className="size-4 animate-spin" />Protokoll wird geladen…
              </div>
            )}
            <CallHistory key={lead.id} leadId={lead.id} />
            {!loading && activities.map((a) => {
              const meta = ACTIVITY_META[a.type] || ACTIVITY_META.note;
              const isEditing = editingId === a.id;
              return (
                <div key={a.id} className="border-b border-border-subtle py-4">
                  <div className="flex gap-3">
                    <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', meta.cls)}>{meta.icon}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-text-primary">{meta.label}</span>
                        {a.stageFrom && a.stageTo && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-accent-500/10 px-2 py-0.5 text-xs font-medium text-accent-500">
                            {a.stageFrom}<ArrowRight className="size-3" />{a.stageTo}
                          </span>
                        )}
                        {a.type === 'task' && (
                          <button
                            type="button"
                            onClick={() => toggleTask(a)}
                            className={cn('inline-flex items-center gap-1 text-xs font-medium', a.completed ? 'text-status-success' : 'text-text-muted hover:text-text-primary')}
                          >
                            <CheckCircle className="size-3.5" />{a.completed ? 'erledigt' : 'als erledigt markieren'}
                          </button>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="mt-2 space-y-2">
                          <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={3} className={cn(inputClass, 'resize-none py-2')} />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => saveEdit(a)}>Speichern</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Abbrechen</Button>
                          </div>
                        </div>
                      ) : (
                        a.body && <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">{a.body}</p>
                      )}

                      {(a.reachedDecisionMaker != null || a.decisionMakerName) && (
                        <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-elevated px-2 py-1 text-xs text-text-secondary">
                          <UserCheck className={cn('size-3.5', a.reachedDecisionMaker ? 'text-status-success' : 'text-text-muted')} />
                          {a.reachedDecisionMaker ? 'Entscheider erreicht' : a.reachedDecisionMaker === false ? 'Entscheider nicht erreicht' : 'Entscheider'}
                          {a.decisionMakerName && <span className="font-medium text-text-primary">· {a.decisionMakerName}</span>}
                        </div>
                      )}

                      <div className="mt-2.5 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs text-text-muted">
                          <span className="flex size-5 items-center justify-center rounded-full bg-accent-500/15 text-[10px] font-semibold text-accent-500">{initials(a.createdByName)}</span>
                          <span className="font-medium text-text-secondary">{a.createdByName}</span>
                          {/* Exakte Uhrzeit an JEDEM Eintrag (+ relative Angabe als Kontext). */}
                          <span className="font-medium text-text-secondary" title={exactStamp(a.createdAt)}>· {exactStamp(a.createdAt)}</span>
                          <span className="text-text-muted">· {relTime(a.createdAt)}</span>
                          {a.updatedAt && <span className="italic">· bearbeitet</span>}
                        </div>
                        {canModify(a) && !isEditing && (
                          <div className="flex items-center gap-1">
                            {a.body && (
                              <IconButton className="size-7" onClick={() => { setEditingId(a.id); setEditBody(a.body); }} aria-label="Bearbeiten">
                                <Pencil className="size-3.5" />
                              </IconButton>
                            )}
                            <IconButton className="size-7" tone="danger" onClick={() => removeActivity(a)} aria-label="Löschen">
                              <Trash2 className="size-3.5" />
                            </IconButton>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {!loading && !activityError && activities.length === 0 && (
              <EmptyState icon={<MessageSquare className="size-5" />} title="Noch kein Protokoll" description="Halte oben den ersten Anruf oder die erste Notiz fest." />
            )}
          </div>
        </div>

        {/* ── Info-Karte (kompakt) — im Panel ZUERST (Anrufen/Termine oben) ── */}
        <div hidden={detailTab === "activity"} className="space-y-4">

          <button
            type="button"
            onClick={() => setEmailOpen(true)}
            hidden={detailTab !== "info"}
            title="Persönliche E-Mail an den Lead schreiben"
            className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-elevated px-3 text-sm font-medium text-text-secondary ring-1 ring-inset ring-border-subtle transition-colors hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:text-text-secondary"
          >
            <Mail className="size-4" />E-Mail schreiben
          </button>

          {/* ── Geplante Anrufe / Rückrufe ─────────────────────────── */}
          <div hidden={detailTab !== "next"} className="space-y-3 rounded-md border border-border-subtle bg-surface p-4">
            {appointmentError && <LoadError message="Geplante Anrufe konnten nicht geladen werden." onRetry={() => void reloadAppts()} />}
            <div className="mb-2 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-text-muted">
                <CalendarClock className="size-3.5" />Geplante Anrufe
              </span>
              <button
                type="button"
                hidden={planOpen}
                onClick={() => setPlanOpen(true)}
                className={cn(
                  'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset transition-colors',
                  planOpen
                    ? 'bg-elevated text-text-secondary ring-border-subtle'
                    : 'bg-accent-500/15 text-accent-500 ring-accent-500/30 hover:bg-accent-500/25',
                )}
              >
                {planOpen ? <><X className="size-3.5" />Schließen</> : <><Plus className="size-3.5" />Anruf planen</>}
              </button>
            </div>

            {planOpen && <CallbackPlanner controller={callbackPlanner} admins={admins} onClose={()=>setPlanOpen(false)}/>}

            {appts.length === 0 && !planOpen && !appointmentError && (
              <p className="py-1 text-xs text-text-muted">Kein Anruf geplant.</p>
            )}
            {appts.length > 0 && (
              <ul className="space-y-1.5">
                {appts.map((a) => {
                  const overdue = isOverdue(a.start_at);
                  return (
                    <li key={a.id} className="flex items-center gap-2 rounded-lg border border-border-subtle bg-canvas/60 p-2">
                      <span className={cn(
                        'flex size-7 shrink-0 items-center justify-center rounded-md',
                        overdue ? 'bg-status-danger/15 text-status-danger' : 'bg-accent-500/10 text-accent-500',
                      )}>
                        <PhoneCall className="size-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={cn('text-sm font-medium', overdue ? 'text-status-danger' : 'text-text-primary')}>
                          {apptLabel(a.start_at)}
                          {overdue && <span className="ml-1.5 text-[10px] font-semibold uppercase">überfällig</span>}
                        </p>
                        <p className="truncate text-xs text-text-muted">
                          {CALL_TYPE_LABEL[a.type] || 'Termin'}
                          {a.assignee_name ? ` · ${a.assignee_name}` : ''}
                          {a.notes ? ` · ${a.notes}` : ''}
                        </p>
                      </div>
                      <IconButton className="size-7" onClick={() => completeAppt(a)} aria-label="Als erledigt markieren" title="Erledigt">
                        <CheckCircle className="size-3.5" />
                      </IconButton>
                      <IconButton className="size-7" tone="danger" onClick={() => removeAppt(a)} aria-label="Absagen" title="Absagen">
                        <X className="size-3.5" />
                      </IconButton>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div hidden={detailTab !== "info"} className="space-y-4">
          <div className="space-y-1 border-b border-border-subtle pb-4">
            <InfoRow icon={<User className="size-4" />} label="Kontakt" value={lead.contactPerson || '—'} />
            {lead.phone && <InfoRow icon={<Phone className="size-4" />} label="Telefon" value={lead.phone} />}
            {lead.email && <InfoRow icon={<Mail className="size-4" />} label="E-Mail" value={lead.email} />}
            {lead.website && (
              <InfoRow icon={<Globe className="size-4" />} label="Website" value={
                <a href={safeWebsiteUrl(lead.website)} target="_blank" rel="noopener noreferrer" className="text-accent-500 hover:text-accent-500">{lead.website.replace(/^https?:\/\//, '')}</a>
              } />
            )}
            {(lead.city || lead.country) && <InfoRow icon={<MapPin className="size-4" />} label="Standort" value={`${lead.city || ''}${lead.city && lead.country ? ', ' : ''}${lead.country || ''}`} />}
            {lead.industry && <InfoRow icon={<Briefcase className="size-4" />} label="Branche" value={lead.industry} />}
            {lead.source && <InfoRow icon={<TagIcon className="size-4" />} label="Quelle" value={lead.source} />}
            {lead.assignedTo && <InfoRow icon={<User className="size-4" />} label="Zugewiesen" value={lead.assignedTo} />}
            {!!lead.value && <InfoRow icon={<Star className="size-4" />} label="Wert" value={`€${lead.value.toLocaleString('de-DE')}`} />}
            {dmName && <InfoRow icon={<UserCheck className="size-4" />} label="Entscheider" value={dmName} />}
          </div>

          {lead.tags && lead.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {lead.tags.map((tag) => <Badge key={tag} tone="accent">{tag}</Badge>)}
            </div>
          )}

          {lead.notes && (
            <div className="rounded-xl border border-border-subtle bg-elevated/40 p-3">
              <p className="mb-1 text-xs font-medium text-text-muted">Stamm-Notiz</p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">{lead.notes}</p>
            </div>
          )}

          <div className="space-y-1.5 px-1 text-xs text-text-muted">
            {lead.createdAt && (
              <div className="flex items-center gap-2"><Calendar className="size-3.5" />Erstellt: {new Date(lead.createdAt).toLocaleDateString('de-DE')}</div>
            )}
            {lead.nextFollowUpDate && (
              <div className="flex items-center gap-2"><Clock className="size-3.5" />Follow-up: {new Date(lead.nextFollowUpDate).toLocaleDateString('de-DE')}</div>
            )}
          </div>
          </div>
        </div>
      </div>
    </Shell>{emailOpen && <LeadEmailComposer leadId={lead.id} conversationNotes={(hasCallNote?phone?.notes?.text:note)||''} onState={setEmailState} onClose={()=>setEmailOpen(false)} onSent={()=>{void reload();onLeadChanged?.();}}/>}</>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent-500/10 text-accent-500">{icon}</span>
      <span className="w-20 shrink-0 text-xs text-text-muted">{label}</span>
      <span className="min-w-0 flex-1 break-words text-sm font-medium text-text-primary">{value}</span>
    </div>
  );
}
