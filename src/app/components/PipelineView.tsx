import { useState, useEffect, useMemo } from 'react';
import { getLeads, saveLead, deleteLead, getSettings, type Lead, type PipelineStage } from '../utils/storage';
import { LoadError } from './LoadError';
import { stageCategory, stageAgeDays } from '../utils/stages';
import { LeadDetailModal } from './LeadDetailModal';
import { LeadModal } from './LeadModal';
import { Phone, Mail, Inbox, CalendarClock, ListTodo, Columns3, Table2, ArrowUpRight, TimerOff, TrendingUp } from 'lucide-react';
import { Badge, Card, EmptyState, PageHeader, PriorityPill, SEITEN_RAND, cn, inputClass, statusColor } from './ui-kit';
import { toast } from 'sonner';
import { localDayKey, timestamp } from '../utils/leadQuality';
import { pipelineWorkspace, type PipelineFocus } from '../utils/pipelineWorkspace';
import { useWorkspaceTime } from '../utils/useWorkspaceTime';
import { LeadQuickAdd as QuickAdd } from './LeadQuickAdd';
import { useWorkspacePreference } from '../utils/useWorkspacePreference';
import { useResultPage } from '../utils/useResultPage';
import { indexLeadSearch, leadSearchQuery } from '../utils/leadSearch';
import { Search, RotateCcw } from 'lucide-react';
import { Button } from './ui-kit';
import { mayLeaveWorkspace } from '../utils/useWorkspaceGuard';

const EUR = (n: number) => '€' + (n || 0).toLocaleString('de-DE');

export function PipelineView() {
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [selectedStage, setSelectedStage] = useWorkspacePreference<string>('pipeline.stage', '');
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useWorkspacePreference<'board' | 'list'>('pipeline.mode', 'board', ['board','list']);
  const [assignee, setAssignee] = useWorkspacePreference<string>('pipeline.owner', 'all');
  const [focus, setFocus] = useWorkspacePreference<PipelineFocus>('pipeline.focus', 'all', ['all','due','no_next_step','stalled']);
  const [search, setSearch] = useWorkspacePreference<string>('pipeline.search', '');
  const [stageLimits, setStageLimits] = useState<Record<string, number>>({});
  const searchIndex = useMemo(() => indexLeadSearch(leads), [leads]);
  const searchedLeads = useMemo(() => { const matches = leadSearchQuery(search); return leads.filter(lead=>matches(searchIndex.get(lead.id))); }, [leads, searchIndex, search]);
  const [moving, setMoving] = useState<string | null>(null);
  // Stammdaten-Maske aus dem Aktivitäten-Overlay geöffnet? → Zurück-Pfeil.
  const [editFromDetail, setEditFromDetail] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoadError(false); setLoading(true);
    try {
      const allLeads = await getLeads();
      const activeStages = getSettings().pipelineStages.filter((s) => s.isActive).sort((a, b) => a.order - b.order);
      setLeads(Array.isArray(allLeads) ? allLeads : []);
      setStages(activeStages);
      return true;
    } catch (error) {
      console.error('Failed to load pipeline data:', error);
      setLoadError(true);
      return false;
    } finally { setLoading(false); }
  };

  // Standard-Auswahl: erste Pipeline-Stufe, sobald die Stages geladen sind.
  useEffect(() => {
    if (stages.length && !stages.some(stage => stage.name === selectedStage)) setSelectedStage(stages[0].name);
  }, [stages, selectedStage]);

  const quickAdd = async (company: string, status: string) => {
    const c = company.trim();
    if (!c) return;
    await saveLead({ company: c, status, source: 'Manuell' });
    if (await loadData()) toast.success(`„${c}“ angelegt.`);
    else toast.warning('Lead wurde angelegt. Nur die Liste konnte nicht aktualisiert werden. Bitte neu laden, nicht erneut anlegen.');
  };

  const handleDeleteLead = async (id: string) => {
    if (confirm('Möchten Sie diesen Lead wirklich löschen?')) {
      try { await deleteLead(id); setLeads((prev) => prev.filter((l) => l.id !== id)); }
      catch { toast.error('Lead konnte nicht gelöscht werden.'); }
    }
  };

  const handleSaveLead = async (lead: Partial<Lead>) => {
    await saveLead(lead);
    await loadData();
    setIsModalOpen(false); setEditingLead(null); setEditFromDetail(false);
  };

  async function moveLead(id: string, status: string) {
    const lead = leads.find((item) => item.id === id);
    if (!lead || lead.id.startsWith('tmp-') || lead.status === status || moving) return;
    setMoving(id);
    try { await saveLead({ id, status }); setLeads((rows) => rows.map((item) => item.id === id ? { ...item, status, stageId: stages.find((stage) => stage.name === status)?.id, stageCategory: stageCategory(stages.find((stage) => stage.name === status)), stageEnteredAt: new Date().toISOString() } : item)); toast.success(`In „${status}“ verschoben.`); }
    catch { toast.error('Die Phase wurde nicht geändert. Bitte erneut versuchen.'); }
    finally { setMoving(null); }
  }
  const workspaceTime = useWorkspaceTime();
  const today = localDayKey(new Date(workspaceTime));
  const workspace = useMemo(() => pipelineWorkspace(searchedLeads, stages, assignee, focus, today, workspaceTime), [searchedLeads, stages, assignee, focus, today, workspaceTime]);
  const assignees = useMemo(() => [...new Set(leads.map(lead => lead.assignedTo).filter(Boolean))].sort(), [leads]);
  const selectedGroup = workspace.groups.get(stages.find(stage => stage.name === selectedStage)?.id ?? '');
  const selectedLeads = selectedGroup?.leads ?? [];
  const selectedSum = selectedGroup?.value ?? 0;
  const resultPage = useResultPage(selectedLeads, JSON.stringify([selectedStage, search, assignee, focus]), {remember:'pipeline', loading});

  return (
    <div className={cn(SEITEN_RAND, 'crm-pipeline space-y-5')}>
      <PageHeader title="Pipeline" subtitle="Verkaufschancen steuern. Nächste Schritte im Blick behalten." actions={<div className="flex flex-wrap items-center gap-2"><select aria-label="Pipeline nach Zuständigkeit filtern" className={`${inputClass} w-auto max-w-full`} value={assignee} onChange={(e) => setAssignee(e.target.value)}><option value="all">Gesamtes Team</option><option value="unassigned">Nicht zugewiesen</option>{assignees.map((name) => <option key={name} value={name}>{name}</option>)}</select><div className="flex rounded-lg border border-border-subtle bg-surface p-1">{(['board', 'list'] as const).map((view) => <button key={view} aria-pressed={mode === view} onClick={() => setMode(view)} className={cn('flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors', mode === view ? 'bg-accent-500/10 font-semibold text-accent-500' : 'text-text-muted hover:bg-elevated')}>{view === 'board' ? <Columns3 className="size-4" aria-hidden /> : <Table2 className="size-4" aria-hidden />}{view === 'board' ? 'Board' : 'Liste'}</button>)}</div></div>} />

      <div className="flex flex-wrap items-center gap-2"><div className="relative min-w-48 max-w-md flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted"/><input aria-label="Pipeline durchsuchen" placeholder="Firma, Kontakt, Nummer oder Ort" className={inputClass+' pl-9'} value={search} onChange={event=>setSearch(event.target.value)}/></div><Button variant="ghost" onClick={()=>{setSearch('');setAssignee('all');setFocus('all');}}><RotateCcw className="size-3.5"/>Filter zurücksetzen</Button></div>
      {!loading && !loadError && <section aria-label="Pipeline-Arbeitsansichten" className="crm-command-bar flex flex-wrap items-center gap-3 border border-border-subtle bg-surface p-3">
        <div className="mr-auto flex flex-wrap items-center gap-x-6 gap-y-2 px-2">
          <div><p className="text-xs text-text-muted">Offene Chancen · gewählte Zuständigkeit</p><p className="mt-1 font-display text-xl font-semibold tabular-nums">{EUR(workspace.openValue)} <span className="font-sans text-sm font-normal text-text-muted">/ {workspace.open} Leads</span></p></div>
          {workspace.weightedCoverage > 0 && <div className="border-l border-border-subtle pl-5"><p className="flex items-center gap-1.5 text-xs text-text-muted"><TrendingUp className="size-3.5" />Gewichtete Planung</p><p className="mt-1 font-display text-lg font-semibold tabular-nums">{EUR(Math.round(workspace.weightedValue))} <span className="font-sans text-xs font-normal text-text-muted">aus {workspace.weightedCoverage} bewerteten</span></p></div>}
        </div>
        {([
          { key: 'all', label: 'Alle Phasen', icon: Columns3, count: null },
          { key: 'due', label: 'Heute / überfällig', icon: CalendarClock, count: workspace.due },
          { key: 'no_next_step', label: 'Ohne nächsten Schritt', icon: ListTodo, count: workspace.noNextStep },
          { key: 'stalled', label: 'Seit 14+ Tagen in Phase', icon: TimerOff, count: workspace.stalled },
        ] as const).map(({ key, label, icon: Icon, count }) => <button key={key} aria-pressed={focus === key} onClick={() => setFocus(key)} className={cn('flex min-h-10 items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors', focus === key ? 'border-accent-500 bg-accent-500/10 font-medium text-accent-500' : 'border-border-subtle text-text-secondary hover:bg-elevated')}><Icon className={cn('size-4', key === 'due' && 'text-status-warning')} aria-hidden />{label}{count !== null && <span className="rounded-md bg-elevated px-1.5 text-xs font-semibold tabular-nums text-text-primary">{count}</span>}</button>)}
      </section>}

      {loadError && <LoadError message="Pipeline konnte nicht geladen werden." onRetry={() => void loadData()} />}
      {loading && <p role="status" className="text-sm text-text-muted">Pipeline wird geladen…</p>}
      {workspace.unmapped.length > 0 && !loading && !loadError && <section aria-label="Leads ohne aktive Phase" className="rounded-xl border border-status-warning/30 bg-status-warning/10 p-4"><h2 className="text-sm font-semibold text-status-warning">{workspace.unmapped.length} Leads ohne aktive Phase</h2><p className="mt-1 text-xs text-text-secondary">Diese Leads sind nicht im Board enthalten. Öffne die Akte, um die Phase zu prüfen.</p><div className="mt-2 flex flex-wrap gap-2">{workspace.unmapped.map(lead => <button key={lead.id} onClick={() => { if (mayLeaveWorkspace()) setDetailLead(lead); }} className="rounded-md border border-border-subtle bg-surface px-2 py-1 text-sm text-text-primary hover:border-accent-500">{lead.company}</button>)}</div></section>}
      {moving && <p role="status" className="text-sm text-accent-500">Phasenwechsel wird gespeichert…</p>}
      {!loading && !loadError && stages.length === 0 && <EmptyState icon={<Columns3 className="size-5" />} title="Noch keine aktiven Phasen" description="Lege die Vertriebsphasen unter Pipeline-Setup an." />}
      {mode === 'board' && <div className="crm-pipeline-board flex items-start gap-3 overflow-x-auto pb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500" role="region" tabIndex={0} aria-label="Vertriebspipeline">
        {stages.map((stage) => {
          const group = workspace.groups.get(stage.id)!;
          const rows = group.leads;
          return <section key={stage.id} className="crm-pipeline-column w-72 max-w-full shrink-0 overflow-hidden border border-border-subtle bg-elevated/50" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void moveLead(e.dataTransfer.getData('text/plain'), stage.name); }} aria-label={stage.name}>
            <div className="border-b border-t-4 border-border-subtle bg-surface px-4 py-3" style={{ borderTopColor: statusColor(stage.name) }}><div className="flex items-center justify-between gap-2"><h2 className="font-semibold">{stage.name}</h2><span className="rounded-md bg-elevated px-2 py-0.5 text-sm font-semibold tabular-nums text-text-secondary">{rows.length}</span></div><p className="mt-2 text-lg font-semibold tabular-nums">{EUR(group.value)}</p>{typeof stage.probability === 'number' && <p className="mt-0.5 text-xs text-text-muted">{stage.probability}% Planannahme · kein Forecast</p>}</div>
            <div className="max-h-[65vh] space-y-3 overflow-y-auto overscroll-contain p-3">{rows.slice(0, stageLimits[stage.id] || 25).map((lead) => { const age = stageAgeDays(lead, workspaceTime); return <article key={lead.id} draggable={!moving && !lead.id.startsWith('tmp-')} onDragStart={(e) => e.dataTransfer.setData('text/plain', lead.id)} className="rounded-lg border border-border-subtle bg-surface p-3 shadow-sm transition-colors hover:border-border-strong">
              <button onClick={() => { if (mayLeaveWorkspace()) setDetailLead(lead); }} disabled={lead.id.startsWith('tmp-')} className="group w-full rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"><span className="flex items-start justify-between gap-2 text-sm font-semibold"><span className="break-words">{lead.company}</span><ArrowUpRight className="size-4 shrink-0 text-text-muted group-hover:text-accent-500" aria-hidden /></span><span className="mt-1 block text-xs text-text-muted">{lead.contactPerson || 'Ansprechpartner fehlt'}</span></button><div className="mt-3 flex justify-between gap-2 text-xs text-text-secondary"><span className="truncate">{lead.assignedTo || 'Nicht zugewiesen'}</span><span className="shrink-0 font-semibold tabular-nums">{EUR(lead.value || 0)}</span></div><p className={cn('mt-3 flex items-center gap-1.5 rounded-md bg-elevated/50 px-2 py-1.5 text-xs', stageCategory(stage) === 'open' && timestamp(lead.nextFollowUpDate) > 0 && lead.nextFollowUpDate!.slice(0, 10) <= today ? 'text-status-warning' : 'text-text-muted')}><CalendarClock className="size-3.5 shrink-0" aria-hidden />{timestamp(lead.nextFollowUpDate) > 0 ? `Wiedervorlage ${new Date(lead.nextFollowUpDate!).toLocaleDateString('de-DE')}` : 'Nächsten Schritt planen'}</p>
              <p className={cn('mt-2 text-sm', age !== null && age >= 14 && stageCategory(stage) === 'open' ? 'font-medium text-status-warning' : 'text-text-muted')}>{age === null ? 'Eintrittsdatum nicht erfasst' : age >= 14 && stageCategory(stage) === 'open' ? `${age} Tage in dieser Phase · prüfen` : `${age} Tage in dieser Phase`}</p>
              <select aria-label={`Phase für ${lead.company}`} className={`${inputClass} mt-3 text-xs`} value={stage.name} disabled={Boolean(moving) || lead.id.startsWith('tmp-')} onChange={(e) => void moveLead(lead.id, e.target.value)}>{stages.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select>
            </article>; })}{rows.length>(stageLimits[stage.id]||25)&&<Button className="w-full" variant="ghost" size="sm" onClick={()=>setStageLimits(previous=>({...previous,[stage.id]:(previous[stage.id]||25)+25}))}>{Math.min(25,rows.length-(stageLimits[stage.id]||25))} weitere Leads anzeigen</Button>}{!loading && !loadError && !rows.length && <p className="px-2 py-5 text-center text-sm text-text-muted">{focus === 'all' ? 'Keine Leads in dieser Phase' : 'Keine Leads für diesen Arbeitsfilter'}</p>}</div><div className="border-t border-border-subtle p-2"><QuickAdd onAdd={(company) => quickAdd(company, stage.name)} /></div>
          </section>;
        })}
      </div>}

      {/* Pipeline-Stufen als Karten (klickbar)
       *
       * `auto-fit` statt einer festen Spaltenzahl. Hier stand `xl:grid-cols-7`
       * bei acht Stufen — die achte ("Verloren") stand allein in einer zweiten
       * Reihe und die erste Reihe war voll. Das sieht nach Versehen aus, weil
       * es eines ist.
       *
       * Eine feste Zahl kann hier auch gar nicht stimmen: die Stufen werden im
       * Pipeline-Setup frei angelegt und gelöscht. Jede fest verdrahtete
       * Spaltenzahl ist ab der nächsten Änderung wieder falsch, und zwar
       * unbemerkt. `auto-fit` mit einer Mindestbreite füllt die Reihe mit so
       * vielen Karten, wie hineinpassen, und verteilt den Rest gleichmässig —
       * bei sechs Stufen genauso wie bei zwölf.
       */}
      {mode === 'list' && <div className="flex flex-wrap gap-1 border-b border-border-subtle" aria-label="Pipeline-Phasen">
        {stages.map((stage) => {
          const group = workspace.groups.get(stage.id)!;
          const stageLeads = group.leads;
          const sum = group.value;
          const color = statusColor(stage.name);
          const active = selectedStage === stage.name;
          return (
            <button
              key={stage.id}
              type="button"
              aria-pressed={active}
              onClick={() => setSelectedStage(stage.name)}
              className={cn(
                'crm-view-tab',
                active
                  ? 'text-accent-500'
                  : 'border-border-subtle bg-surface hover:border-border-strong',
              )}
            >
              <div className="flex items-center gap-2">
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden />
                <span className="truncate text-sm font-medium text-text-primary">{stage.name}</span>
              </div>
              <span title={EUR(sum)}>{stageLeads.length}</span>
            </button>
          );
        })}
      </div>}

      {/* Leads der gewählten Stufe */}
      {mode === 'list' && selectedStage && !loading && !loadError && (
        <Card className="overflow-visible">
          <div className="flex flex-wrap items-center gap-3 border-b border-border-subtle px-4 py-3">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: statusColor(selectedStage) }} aria-hidden />
            <h3 className="text-sm font-semibold text-text-primary">{selectedStage}</h3>
            <Badge tone="neutral">{selectedLeads.length} Leads</Badge>
            <span className="text-xs text-text-muted tabular-nums">· {EUR(selectedSum)}</span>
            <div className="ml-auto">
              <QuickAdd onAdd={(c) => quickAdd(c, selectedStage)} />
            </div>
          </div>

          {selectedLeads.length === 0 ? (
            <EmptyState icon={<Inbox className="size-5" />} title="Keine Leads in dieser Stufe" description="Wähle eine andere Stufe oder füge oben rechts einen Lead hinzu." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle bg-elevated/50">
                    <th className="label-technical px-4 py-3 text-left text-text-muted">Firma</th>
                    <th className="label-technical px-4 py-3 text-left text-text-muted">Kontakt</th>
                    <th className="label-technical px-4 py-3 text-left text-text-muted">Verantwortlich</th>
                    <th className="label-technical px-4 py-3 text-left text-text-muted">Nächster Schritt</th>
                    <th className="label-technical px-4 py-3 text-left text-text-muted">Quelle</th>
                    <th className="label-technical px-4 py-3 text-left text-text-muted">Priorität</th>
                    <th className="label-technical px-4 py-3 text-right text-text-muted">Wert</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {resultPage.rows.map((lead) => (
                    <tr
                      key={lead.id}
                      onClick={() => { if (mayLeaveWorkspace()) setDetailLead(lead); }}
                      className="cursor-pointer transition-colors hover:bg-elevated"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-accent-500/15 text-sm font-semibold text-accent-500">
                            {(lead.company || '?')[0]}
                          </div>
                          <button onClick={event => { event.stopPropagation(); if (mayLeaveWorkspace()) setDetailLead(lead); }} className="rounded text-left font-medium text-text-primary hover:text-accent-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500">{lead.company || '—'}</button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        <div className="flex flex-col gap-0.5">
                          {lead.contactPerson && <span>{lead.contactPerson}</span>}
                          <span className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
                            {lead.phone && <span className="inline-flex items-center gap-1"><Phone className="size-3" />{lead.phone}</span>}
                            {lead.email && <span className="inline-flex items-center gap-1"><Mail className="size-3" />{lead.email}</span>}
                            {!lead.contactPerson && !lead.phone && !lead.email && '—'}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-text-secondary">{lead.assignedTo || <span className="text-status-warning">Nicht zugewiesen</span>}</td>
                      <td className="whitespace-nowrap px-4 py-3"><span className={cn('inline-flex items-center gap-1.5', timestamp(lead.nextFollowUpDate) > 0 && lead.nextFollowUpDate!.slice(0, 10) <= today ? 'font-medium text-status-warning' : 'text-text-secondary')}><CalendarClock className="size-3.5" />{timestamp(lead.nextFollowUpDate) > 0 ? new Date(lead.nextFollowUpDate!).toLocaleDateString('de-DE') : 'Nicht geplant'}</span></td>
                      <td className="px-4 py-3">{lead.source ? <Badge tone="neutral">{lead.source}</Badge> : <span className="text-text-muted">—</span>}</td>
                      <td className="px-4 py-3">{lead.priority ? <PriorityPill priority={lead.priority} /> : <span className="text-text-muted">—</span>}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-text-primary">€{(lead.value || 0).toLocaleString('de-DE')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {mode === 'list' && !loading && !loadError && selectedLeads.length > 0 && <nav aria-label="Pipeline-Ergebnisseiten" className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle py-3 text-xs text-text-secondary"><span>{resultPage.start+1}–{resultPage.end} von {selectedLeads.length} Leads</span><div className="flex items-center gap-2"><select aria-label="Pipeline-Leads pro Seite" className={inputClass} value={resultPage.size} onChange={event=>resultPage.setSize(Number(event.target.value))}>{[25,50,100].map(size=><option key={size} value={size}>{size} pro Seite</option>)}</select><Button size="sm" variant="ghost" disabled={resultPage.page===1} onClick={()=>resultPage.setPage(resultPage.page-1)}>Zurück</Button><span className="whitespace-nowrap tabular-nums">{resultPage.page} / {resultPage.pages}</span><Button size="sm" variant="ghost" disabled={resultPage.page===resultPage.pages} onClick={()=>resultPage.setPage(resultPage.page+1)}>Weiter</Button></div></nav>}

      {isModalOpen && (
        <LeadModal
          lead={editingLead}
          onClose={() => {
            setIsModalOpen(false);
            setEditingLead(null);
            setEditFromDetail(false);
          }}
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

      {detailLead && (
        <LeadDetailModal
          key={detailLead.id}
          lead={detailLead}
          onClose={() => setDetailLead(null)}
          onEdit={(lead) => {
            setDetailLead(null);
            setEditingLead(lead);
            setEditFromDetail(true);
            setIsModalOpen(true);
          }}
          onLeadChanged={loadData}
          onDelete={() => {
            handleDeleteLead(detailLead.id);
            setDetailLead(null);
          }}
        />
      )}
    </div>
  );
}
