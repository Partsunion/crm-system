import { useState, useEffect, useMemo } from 'react';
import { useWorkspacePreference } from '../utils/useWorkspacePreference';
import { localDayKey } from '../utils/leadQuality';
import { TrendingUp } from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, RadialBarChart, RadialBar, PolarAngleAxis,
} from 'recharts';
import { LoadError } from './LoadError';
import { leadCategory, stageCategory } from '../utils/stages';
import { getLeads, getSettings, type Lead } from '../utils/storage';
import { Card, EmptyState, PageHeader, SEITEN_RAND, SectionLabel, statusColor, inputClass, Button } from './ui-kit';
import { AnimatedNumber } from './anim';
import { cn } from './ui/utils';

const EUR0 = (n: number) => '€' + Math.round(n || 0).toLocaleString('de-DE');
const SOURCE_PALETTE = ['#1D6FE8', '#00C875', '#FDAB3D', '#A25DDC', '#FF642E', '#66CCFF', '#E2445C', '#9AADBD'];

function useChartTheme() {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const observer = new MutationObserver(() => setRevision(value=>value+1));
    observer.observe(document.documentElement, {attributes:true, attributeFilter:['class','data-theme']});
    return () => observer.disconnect();
  }, []);
  return useMemo(() => {
    void revision; // Refresh CSS token values when the user switches themes.
    const fb = { axis: '#9AA3AD', grid: '#252A31', elevated: '#1A1E24', primary: '#E8ECF1', accent: '#1D6FE8' };
    if (typeof document === 'undefined') return fb;
    const cs = getComputedStyle(document.documentElement);
    const v = (n: string, f: string) => cs.getPropertyValue(n).trim() || f;
    return {
      axis: v('--text-secondary', fb.axis),
      grid: v('--border', fb.grid),
      elevated: v('--bg-elevated', fb.elevated),
      primary: v('--text-primary', fb.primary),
      accent: v('--accent-500', fb.accent),
    };
  }, [revision]);
}

export function LeadInventoryReport() {
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadTick, setLoadTick] = useState(0);
  const [allLeads, setLeads] = useState<Lead[]>([]);
  const [source, setSource] = useWorkspacePreference<string>('reports.source', 'all');
  const [owner, setOwner] = useWorkspacePreference<string>('reports.owner', 'all');
  const [createdFrom, setCreatedFrom] = useWorkspacePreference<string>('reports.createdFrom', '');
  const [createdTo, setCreatedTo] = useWorkspacePreference<string>('reports.createdTo', '');
  const leads = useMemo(() => allLeads.filter((lead) => (source === 'all' || lead.source === source)
    && (owner === 'all' || lead.assignedTo === owner) && (!createdFrom || lead.createdAt.slice(0, 10) >= createdFrom)
    && (!createdTo || lead.createdAt.slice(0, 10) <= createdTo)), [allLeads, source, owner, createdFrom, createdTo]);
  const theme = useChartTheme();

  useEffect(() => {
    (async () => {
      setLoading(true); setLoadError(false);
      try {
        const data = await getLeads();
        setLeads(Array.isArray(data) ? data : []);
      } catch { setLoadError(true); } finally { setLoading(false); }
    })();
  }, [loadTick]);

  const total = leads.length;
  const won = leads.filter((l) => leadCategory(l) === 'won');
  const lost = leads.filter((l) => leadCategory(l) === 'lost');
  const wonValue = won.reduce((s, l) => s + (l.value || 0), 0);
  const totalValue = leads.reduce((s, l) => s + (l.value || 0), 0);
  const winRate = won.length + lost.length > 0 ? Math.round((won.length / (won.length + lost.length)) * 100) : 0;
  const avgDeal = won.length > 0 ? wonValue / won.length : 0;
  const conversion = total > 0 ? Math.round((won.length / total) * 100) : 0;

  // Funnel (Pipeline-Reihenfolge)
  const stages = getSettings().pipelineStages.filter((s) => s.isActive).sort((a, b) => a.order - b.order);
  const funnel = stages
    .filter((s) => stageCategory(s) !== 'lost')
    .map((s) => ({ name: s.name, count: leads.filter((l) => l.status === s.name).length }));
  const funnelMax = Math.max(1, ...funnel.map((f) => f.count));

  // Quellen
  const bySource = useMemo(() => {
    const map = new Map<string, number>();
    leads.forEach((l) => map.set(l.source || 'Unbekannt', (map.get(l.source || 'Unbekannt') || 0) + 1));
    return Array.from(map, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [leads]);

  // Wert über Zeit (letzte 6 Monate)
  const byMonth = useMemo(() => {
    const now = new Date();
    const buckets: { key: string; label: string; value: number; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleDateString('de-DE', { month: 'short' }),
        value: 0,
        count: 0,
      });
    }
    const idx = new Map(buckets.map((b, i) => [b.key, i]));
    leads.forEach((l) => {
      const d = new Date(l.createdAt);
      const k = `${d.getFullYear()}-${d.getMonth()}`;
      const i = idx.get(k);
      if (i !== undefined) {
        buckets[i].value += l.value || 0;
        buckets[i].count += 1;
      }
    });
    return buckets;
  }, [leads]);

  // Leaderboard nach Zuständigem (gewonnener Wert)
  const leaderboard = useMemo(() => {
    const map = new Map<string, { value: number; count: number }>();
    won.forEach((l) => {
      const k = l.assignedTo || 'Nicht zugewiesen';
      const cur = map.get(k) || { value: 0, count: 0 };
      map.set(k, { value: cur.value + (l.value || 0), count: cur.count + 1 });
    });
    return Array.from(map, ([name, v]) => ({ name, ...v })).sort((a, b) => b.value - a.value).slice(0, 6);
  }, [won]);

  const tooltipStyle = {
    backgroundColor: theme.elevated,
    border: `1px solid ${theme.grid}`,
    borderRadius: '8px',
    color: theme.primary,
    fontSize: '12px',
  };

  if (loadError) return <div className={SEITEN_RAND}><PageHeader title="Berichte" subtitle="Aktueller Lead-Bestand" /><LoadError message="Berichte konnten nicht geladen werden." onRetry={() => setLoadTick((tick) => tick + 1)} /></div>;
  if (loading) return <p role="status" className={SEITEN_RAND}>Berichte werden geladen…</p>;

  if (allLeads.length === 0) {
    return (
      <div className={'space-y-6'}>
        <h2 className="text-lg font-semibold">Pipeline-Bestand</h2>
        <Card>
          <EmptyState icon={<TrendingUp className="size-5" />} title="Noch keine Daten" description="Sobald Leads vorhanden sind, erscheinen hier Auswertungen." />
        </Card>
      </div>
    );
  }

  return (
    <div className={'space-y-6'}>
      <h2 className="text-lg font-semibold">Pipeline-Bestand</h2>
      <Card className="p-4"><div className="flex flex-wrap items-end gap-3"><label className="text-sm text-text-secondary">Quelle<select className={inputClass} value={source} onChange={(e) => setSource(e.target.value)}><option value="all">Alle Quellen</option>{[...new Set(allLeads.map((lead) => lead.source).filter(Boolean))].sort().map((item) => <option key={item}>{item}</option>)}</select></label><label className="text-sm text-text-secondary">Zuständigkeit<select className={inputClass} value={owner} onChange={(e) => setOwner(e.target.value)}><option value="all">Gesamtes Team</option>{[...new Set(allLeads.map((lead) => lead.assignedTo).filter(Boolean))].sort().map((item) => <option key={item}>{item}</option>)}</select></label><label className="text-sm text-text-secondary">Erstellt ab<input className={inputClass} type="date" value={createdFrom} onChange={(e) => setCreatedFrom(e.target.value)} /></label><label className="text-sm text-text-secondary">Erstellt bis<input className={inputClass} type="date" value={createdTo} onChange={(e) => setCreatedTo(e.target.value)} /></label><Button variant="ghost" onClick={() => { setSource('all'); setOwner('all'); setCreatedFrom(''); setCreatedTo(''); }}>Zurücksetzen</Button><span className="ml-auto text-sm text-text-muted">{total} Leads in dieser Auswertung</span></div></Card>
      <p className="text-sm text-text-secondary">Bestandsauswertung nach Erstellungsdatum. Werte sind gepflegte Verkaufschancen, kein gebuchter Umsatz. Phasenanteile bilden keine historische Conversion ab.</p>

      <div className="flex flex-wrap gap-2" aria-label="Berichtszeitraum"><Button size="sm" variant="ghost" onClick={()=>{const now=new Date();setCreatedFrom(localDayKey(new Date(now.getFullYear(),now.getMonth(),1)));setCreatedTo(localDayKey(now));}}>Dieser Monat</Button><Button size="sm" variant="ghost" onClick={()=>{const now=new Date();setCreatedFrom(localDayKey(new Date(now.getFullYear(),now.getMonth()-1,1)));setCreatedTo(localDayKey(new Date(now.getFullYear(),now.getMonth(),0)));}}>Letzter Monat</Button><Button size="sm" variant="ghost" onClick={()=>{setCreatedFrom(new Date().getFullYear()+'-01-01');setCreatedTo(localDayKey(new Date()));}}>Dieses Jahr</Button></div>
      {/* KPIs */}
      <section className="crm-report-facts" aria-label="Vertriebsauswertung">
        <div><span>Gewonnener Wert</span><strong>{EUR0(wonValue)}</strong><small>{won.length} Abschlüsse</small></div>
        <div><span>Abschlussquote</span><strong>{winRate}%</strong><small>{won.length} gewonnen · {lost.length} verloren</small></div>
        <div><span>Ø Abschluss</span><strong>{EUR0(avgDeal)}</strong></div>
        <div><span>Anteil gewonnen</span><strong>{conversion}%</strong><small>von {total} Leads</small></div>
      </section>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Funnel */}
        <Card className="p-4 lg:col-span-2">
          <SectionLabel className="mb-4 block">Aktueller Bestand nach Phase</SectionLabel>
          <div className="space-y-2.5">
            {funnel.map((f) => (
              <div key={f.name} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-right text-xs text-text-secondary">{f.name}</span>
                <div className="h-7 flex-1 overflow-hidden rounded-md bg-elevated/60">
                  <div
                    className="flex h-full items-center justify-end rounded-md px-2 text-xs font-semibold text-white transition-all duration-700"
                    style={{ width: `${(f.count / funnelMax) * 100}%`, backgroundColor: statusColor(f.name) }}
                  >
                    {f.count}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Win-Rate Gauge */}
        <Card className="flex flex-col p-4">
          <SectionLabel className="mb-2 block">Win-Rate</SectionLabel>
          <div className="relative flex-1">
            <ResponsiveContainer width="100%" height={200}>
              <RadialBarChart innerRadius="72%" outerRadius="100%" data={[{ name: 'win', value: winRate, fill: theme.accent }]} startAngle={90} endAngle={-270}>
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar background={{ fill: theme.grid }} dataKey="value" cornerRadius={20} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-3xl font-semibold text-text-primary">
                <AnimatedNumber value={winRate} format={(n) => Math.round(n) + '%'} />
              </span>
              <span className="text-xs text-text-muted">gewonnen</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Value over time */}
        <Card className="p-4">
          <SectionLabel className="mb-4 block">Lead-Wert nach Erstellungsmonat</SectionLabel>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={byMonth} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="rv-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={theme.accent} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={theme.accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: theme.axis, fontSize: 11 }} axisLine={{ stroke: theme.grid }} tickLine={false} />
              <YAxis tick={{ fill: theme.axis, fontSize: 11 }} axisLine={false} tickLine={false} width={48} tickFormatter={(n: number) => (n >= 1000 ? `${n / 1000}k` : `${n}`)} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [EUR0(v), 'Wert']} />
              <Area type="monotone" dataKey="value" stroke={theme.accent} strokeWidth={2} fill="url(#rv-area)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Sources pie */}
        <Card className="p-4">
          <SectionLabel className="mb-4 block">Leads nach Quelle</SectionLabel>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="55%" height={200}>
              <PieChart>
                <Pie data={bySource} dataKey="value" nameKey="name" innerRadius={48} outerRadius={80} paddingAngle={2} stroke="none">
                  {bySource.map((_, i) => (
                    <Cell key={i} fill={SOURCE_PALETTE[i % SOURCE_PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <ul className="flex-1 space-y-1.5">
              {bySource.slice(0, 6).map((s, i) => (
                <li key={s.name} className="flex items-center gap-2 text-sm">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: SOURCE_PALETTE[i % SOURCE_PALETTE.length] }} />
                  <span className="flex-1 truncate text-text-secondary">{s.name}</span>
                  <span className="font-medium text-text-primary tabular-nums">{s.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>

      {/* Leaderboard */}
      <Card className="p-4">
        <SectionLabel className="mb-4 block">Leaderboard — gewonnener Wert</SectionLabel>
        {leaderboard.length > 0 ? (
          <div className="space-y-2.5">
            {leaderboard.map((m, i) => {
              const max = leaderboard[0].value || 1;
              return (
                <div key={m.name} className="flex items-center gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-accent-500/15 font-mono text-xs font-semibold text-accent-500">
                    {i + 1}
                  </span>
                  <span className="w-32 shrink-0 truncate text-sm font-medium text-text-primary">{m.name}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-elevated">
                    <div className="h-full rounded-full bg-accent-500 transition-all duration-700" style={{ width: `${(m.value / max) * 100}%` }} />
                  </div>
                  <span className="w-24 shrink-0 text-right text-sm font-semibold text-text-primary tabular-nums">{EUR0(m.value)}</span>
                  <span className="hidden w-16 shrink-0 text-right text-xs text-text-muted sm:block">{m.count} Deals</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-text-muted">Noch keine gewonnenen Abschlüsse.</p>
        )}
      </Card>

      <p className="text-center text-xs text-text-muted">
        Gesamt-Pipeline-Wert: <span className="font-medium text-text-secondary">{EUR0(totalValue)}</span>
      </p>
    </div>
  );
}
