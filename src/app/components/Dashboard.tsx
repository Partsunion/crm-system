import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlarmClock,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Phone,
  RefreshCw,
  Users,
} from 'lucide-react';
import { getLeads, getAppointments, getCurrentUser, getStatusOptions, type Lead, type Appointment } from '../utils/storage';
import { leadCategory } from '../utils/stages';
import { LoadError } from './LoadError';
import { qualityOf, localDayKey, timestamp } from '../utils/leadQuality';
import { Card, PageHeader, StatusBadge, Button, EmptyState, SEITEN_RAND, statusColor } from './ui-kit';
import { WORKSPACE_CARD_INNER } from './dichte';
import { RankingTable } from '../ranking/RankingTable';
import type { LeadWorkView, LeadWorkRequest } from './LeadsView';
import { useWorkspacePreference } from '../utils/useWorkspacePreference';

export function Dashboard({ onOpenKalender, onOpenLead, onOpenLeads }: { onOpenKalender?: () => void; onOpenLead?: (id: string) => void; onOpenLeads?: (preset?: LeadWorkView, options?: Omit<LeadWorkRequest,'view'>) => void } = {}) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(false);
  const [scope, setScope] = useWorkspacePreference<'mine' | 'team'>('dashboard.scope', 'mine', ['mine','team']);
  const [rankingRevision, setRankingRevision] = useState(0);
  const today = localDayKey(new Date());
  const user = getCurrentUser();

  const load = useCallback(async () => {
    setBusy(true); setError(false);
    try {
      const [rows, events] = await Promise.all([getLeads(), getAppointments({ from: today + 'T00:00', to: today + 'T23:59' })]);
      setLeads(rows); setAppointments(events.filter((a) => !['cancelled', 'declined'].includes(a.status)));
    } catch { setError(true); }
    finally { setBusy(false); }
  }, [today]);

  useEffect(() => { void load(); }, [load]);

  // Evaluate quality and stages once per data update, not once for every tile,
  // stage and scope toggle. Due and unscheduled leads are disjoint sets.
  const { active, unassignedCount, quality, stageCounts } = useMemo(() => {
    const active: Lead[] = [];
    const stageCounts = new Map<string, number>();
    const quality = { complete: 0, noContact: 0, noDealerType: 0, noPerson: 0 };
    let unassignedCount = 0;
    for (const lead of leads) {
      stageCounts.set(lead.status, (stageCounts.get(lead.status) ?? 0) + 1);
      if (leadCategory(lead) !== 'open') continue;
      active.push(lead);
      if (!lead.assignedTo) unassignedCount++;
      const assessment = qualityOf(lead);
      if (!assessment.missing.length) quality.complete++;
      if (!assessment.contactable) quality.noContact++;
      if (!lead.dealerType) quality.noDealerType++;
      if (!lead.contactPerson?.trim()) quality.noPerson++;
    }
    return { active, unassignedCount, quality, stageCounts };
  }, [leads]);
  const { working, due, missingNext, queue } = useMemo(() => {
    const working = scope === 'mine' ? active.filter((lead) => lead.assignedTo?.toLowerCase() === user?.username.toLowerCase()) : active;
    const due = working.filter((lead) => timestamp(lead.nextFollowUpDate) > 0 && lead.nextFollowUpDate!.slice(0, 10) <= today)
      .sort((a, b) => (a.nextFollowUpDate || '').localeCompare(b.nextFollowUpDate || '') || a.company.localeCompare(b.company));
    const missingNext = working.filter((lead) => timestamp(lead.nextFollowUpDate) === 0)
      .sort((a, b) => timestamp(a.updatedAt) - timestamp(b.updatedAt) || a.company.localeCompare(b.company));
    return { working, due, missingNext, queue: [...due, ...missingNext].slice(0, 8) };
  }, [active, scope, today, user?.username]);
  const scopedAppointments = useMemo(() => appointments.filter((a) => scope === 'team' || a.assignee_id === user?.id)
    .sort((a, b) => a.start_at.localeCompare(b.start_at)), [appointments, scope, user?.id]);
  const stages = getStatusOptions();
  const metrics = [
    { label: 'Offene Leads', value: working.length, detail: scope === 'mine' ? 'in deiner Verantwortung' : 'im gesamten Team', preset: scope === 'mine' ? 'mine' : 'all' },
    { label: 'Wiedervorlagen fällig', value: due.length, detail: 'heute und überfällig', preset: 'due' },
    { label: 'Ohne nächsten Schritt', value: missingNext.length, detail: 'benötigen eine Aktion', preset: 'no_next_step' },
    { label: 'Noch nicht zugewiesen', value: unassignedCount, detail: 'im offenen Bestand', preset: 'unassigned' },
  ];

  if (error) return <div className={SEITEN_RAND + ' space-y-5'}><PageHeader title="Arbeitsübersicht" subtitle="Deine tägliche Vertriebsarbeit" /><LoadError message="Die Arbeitsübersicht konnte nicht vollständig geladen werden." onRetry={() => void load()} /></div>;

  return <div className={SEITEN_RAND + ' crm-dashboard space-y-5'}>
    <section className="crm-page-intro border-b border-border pb-4 pt-1">
      <PageHeader
        title="Arbeitsübersicht"
        subtitle={new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}
        actions={<div className="flex max-w-full flex-wrap items-center gap-2">
          <div className="flex max-w-full rounded-lg border border-border bg-canvas/60 p-0.5">
            {(['mine', 'team'] as const).map((value) => <button
              key={value}
              onClick={() => setScope(value)}
              aria-pressed={scope === value}
              className={'rounded-md px-2.5 py-1.5 text-xs transition-colors sm:px-3 ' + (scope === value ? 'bg-surface font-semibold text-text-primary shadow-sm ring-1 ring-border' : 'text-text-secondary hover:bg-elevated')}
            >{value === 'mine' ? 'Meine Arbeit' : 'Gesamtes Team'}</button>)}
          </div>
          <Button variant="secondary" onClick={() => { void load(); setRankingRevision(value => value + 1); }} disabled={busy} aria-label="Arbeitsübersicht aktualisieren">
            <RefreshCw className={'size-4 ' + (busy ? 'animate-spin' : '')} />
          </Button>
        </div>}
      />
    </section>

    <section aria-label="Vertriebskennzahlen" className="crm-facts-line">
      {metrics.map(item => <button type="button" key={item.label} title={item.detail+' · Arbeitsliste öffnen'} onClick={()=>onOpenLeads?.(item.preset as LeadWorkView,{openOnly:true,owner:scope==='mine'&&item.preset!=='unassigned'?user?.username:undefined})} disabled={busy}><span>{item.label}</span><strong>{busy || error ? '—' : item.value}</strong><ArrowRight className="size-3.5" aria-hidden/></button>)}
    </section>

    <div className="crm-dashboard-grid grid items-start gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)]">
      <div className="min-w-0 space-y-6">
      <Card className="crm-focus-panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div><h2 className="flex items-center gap-2 font-semibold"><span className="flex size-8 items-center justify-center rounded-lg bg-status-warning/10 text-status-warning"><AlarmClock className="size-4" /></span>Nächste Schritte</h2><p className="mt-1.5 text-sm text-text-muted">Fällige Wiedervorlagen zuerst, danach Leads ohne Termin.</p></div>
          <Button variant="ghost" size="sm" onClick={()=>onOpenLeads?.('due',{owner:scope==='mine'?user?.username:undefined,openOnly:true})}>Rückrufe öffnen <ArrowRight className="size-4" /></Button>
        </div>
        {busy ? <p className="border-t border-border-subtle p-5 text-sm text-text-muted" role="status">Arbeitsliste wird geladen…</p> : queue.length ? queue.map((lead) => <button key={lead.id} className="crm-work-row" onClick={() => onOpenLead?.(lead.id)}><span className="flex min-w-0 items-center gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-500/[0.10] font-display text-xs font-bold text-accent-500">{lead.company.slice(0, 2).toUpperCase()}</span><span className="min-w-0"><span className="block truncate font-semibold">{lead.company}</span><span className="mt-0.5 block truncate text-sm text-text-muted">{lead.contactPerson || 'Ansprechpartner ergänzen'}</span></span></span><span><StatusBadge status={lead.status} /><span className="mt-1 block text-xs text-text-muted">{lead.assignedTo || 'Nicht zugewiesen'}</span></span><span className={'rounded-lg px-2.5 py-1.5 text-sm font-medium ' + (lead.nextFollowUpDate ? 'bg-status-warning/10 text-status-warning' : 'bg-elevated text-text-secondary')}>{lead.nextFollowUpDate ? new Date(lead.nextFollowUpDate).toLocaleDateString('de-DE') : 'Nächsten Schritt planen'}</span></button>) : !error && <EmptyState icon={<CheckCircle2 className="size-5" />} title={scope === 'mine' && !working.length ? 'Keine offenen Leads zugewiesen' : 'Keine offenen Wiedervorlagen'} description="In der Leadliste findest du den vollständigen Bestand und die Zuständigkeiten." />}
      </Card>
      <Card className={WORKSPACE_CARD_INNER}><h2 className="font-semibold">Pipeline-Bestand</h2><p className="mt-1 text-sm text-text-muted">Aktuelle Verteilung aller Leads. Keine historische Conversion-Rate.</p><div className="mt-5 space-y-3.5">{stages.map((stage) => { const count = stageCounts.get(stage) ?? 0; return <div className="grid grid-cols-[120px_1fr_40px] items-center gap-3 text-sm" key={stage}><span className="truncate font-medium text-text-secondary">{stage}</span><span className="h-2.5 overflow-hidden rounded-full bg-elevated"><span className="block h-full rounded-full transition-[width] duration-300" style={{ width: (leads.length ? count / leads.length * 100 : 0) + '%', backgroundColor: statusColor(stage) }} /></span><span className="text-right font-semibold tabular-nums">{busy ? '—' : count}</span></div>; })}</div></Card>
      </div>
      <div className="min-w-0 space-y-6">
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4"><h2 className="flex items-center gap-2 font-semibold"><span className="flex size-8 items-center justify-center rounded-lg bg-accent-500/[0.10] text-accent-500"><CalendarDays className="size-4" /></span>Termine heute</h2><Button variant="ghost" size="sm" onClick={onOpenKalender}>Kalender <ArrowRight className="size-4" /></Button></div>
        {busy ? <p role="status" className="border-t border-border-subtle p-5 text-sm text-text-muted">Termine werden geladen…</p> : scopedAppointments.length ? scopedAppointments.map((a) => <button className="flex w-full items-start gap-4 border-t border-border-subtle px-5 py-4 text-left transition-colors hover:bg-accent-500/[0.04]" key={a.id} onClick={() => a.company_id && onOpenLead ? onOpenLead(a.company_id) : onOpenKalender?.()}><span className="rounded-lg bg-accent-500/[0.10] px-2.5 py-1.5 font-mono text-sm font-bold tabular-nums text-accent-500">{new Date(a.start_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span><span className="min-w-0"><span className="block truncate font-semibold">{a.customer_name || a.title}</span><span className="mt-1 block text-sm text-text-muted">{a.duration_minutes} Min. · {a.assignee_name || 'Ohne Zuständigkeit'}</span></span></button>) : !error && <EmptyState icon={<CalendarDays className="size-5" />} title="Keine Termine für heute" description="Termine, Einladungen und Rückrufe zentral im Kalender planen." />}
      </Card>
      <Card className={WORKSPACE_CARD_INNER}>
        <div className="flex items-start justify-between gap-4">
          <div><h2 className="font-semibold">Datenqualität</h2><p className="mt-1 text-sm text-text-muted">Basisdaten aller offenen Leads</p></div>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-status-info/10 text-status-info"><Users className="size-4" /></span>
        </div>
        <p className="my-4 border-b border-border-subtle pb-3 text-sm" aria-live="polite">{busy ? 'Basisdaten werden geprüft…' : !active.length ? 'Noch keine offenen Leads vorhanden.' : <><strong className="text-text-primary">{quality.complete} von {active.length}</strong><span className="text-text-secondary"> Leads mit vollständigen Basisdaten</span></>}</p>
        <div className="space-y-3 text-sm">{[
          { label: 'Ohne Kontaktweg', value: quality.noContact },
          { label: 'Ohne Händlerart', value: quality.noDealerType },
          { label: 'Ohne Ansprechpartner', value: quality.noPerson },
        ].map(({ label, value }) => <p key={label} className="flex justify-between gap-3"><span className="text-text-secondary">{label}</span><strong className={value && !busy ? 'text-status-warning' : 'text-text-primary'}>{busy ? '—' : value}</strong></p>)}</div>
        <p className="mt-4 text-xs leading-relaxed text-text-muted">Geprüft werden vorhandene Basisdaten. Kontaktwege sind nicht extern verifiziert.</p>
        <Button className="mt-5" variant="secondary" onClick={()=>onOpenLeads?.()}><Phone className="size-4" /> Leads qualifizieren</Button>
      </Card>
      </div>
    </div>
    <RankingTable refreshKey={rankingRevision} />
  </div>;
}
