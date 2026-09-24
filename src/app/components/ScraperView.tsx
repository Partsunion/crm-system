import { safeWebsiteUrl } from '../utils/safeUrl';
import { useState, useEffect } from 'react';
import { Globe, Search, Radar, MapPin, Check, X, Phone, ExternalLink, Loader2, Download, ListChecks, GitMerge, AlertTriangle, Map } from 'lucide-react';
import { toast } from 'sonner';
import {
  scraperSearch, importScraped, resolveDuplicates, getLeadLists, createLeadList, evaluateWebsite,
  countryScrape, scraperJobStatus, cancelScraperJob,
  type ScrapedCandidate, type LeadList, type ImportConflict, type DuplicateAction, type ScraperJobStatus,
} from '../utils/storage';
import { CustomSelect } from './CustomSelect';
import { Badge, Button, Card, EmptyState, Modal, PageHeader, SEITEN_RAND, SectionLabel, cn, inputClass } from './ui-kit';

// Branchen 1:1 zur Scraper-Backend-Logik (overpass.ts selectorsForNiche).
const NICHES = ['Neuteilehändler', 'Gebrauchtteilehändler'];

const NO_LIST = '— Keine Liste —';

// Länder für den „großen Scrape" (deckungsgleich mit cities.ts im Scraper-Service).
const COUNTRIES: { code: string; label: string }[] = [
  { code: 'DE', label: 'Deutschland' },
  { code: 'AT', label: 'Österreich' },
  { code: 'CH', label: 'Schweiz' },
  { code: 'FR', label: 'Frankreich' },
  { code: 'PL', label: 'Polen' },
];

export function ScraperView() {
  const [tab, setTab] = useState<'radius' | 'country' | 'url'>('radius');
  const [niche, setNiche] = useState('Neuteilehändler');
  const [lists, setLists] = useState<LeadList[]>([]);
  const [targetList, setTargetList] = useState<string>(NO_LIST);

  // Umkreissuche
  const [location, setLocation] = useState('');
  const [searchCountryLabel, setSearchCountryLabel] = useState('Deutschland');
  const [radiusKm, setRadiusKm] = useState(10);
  const [searching, setSearching] = useState(false);
  const [candidates, setCandidates] = useState<ScrapedCandidate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [searched, setSearched] = useState(false);
  const [conflicts, setConflicts] = useState<ImportConflict[]>([]);

  // Großer Scrape (ganzes Land)
  const [countryLabel, setCountryLabel] = useState('Deutschland');
  const [countryRadius, setCountryRadius] = useState(25);
  const [countryJobId, setCountryJobId] = useState<string | null>(null);
  const [countryStatus, setCountryStatus] = useState<ScraperJobStatus | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [countryStarting, setCountryStarting] = useState(false);

  // Einzelne URL
  const [url, setUrl] = useState('');
  const [urlBusy, setUrlBusy] = useState(false);
  const [urlResult, setUrlResult] = useState<ScrapedCandidate | null>(null);

  useEffect(() => { getLeadLists().then(setLists); }, []);

  // Großen Scrape pollen, solange ein Job läuft (Fortschritt + Endmeldung).
  useEffect(() => {
    if (!countryJobId) return;
    let stopped = false;
    const tick = async () => {
      try {
        const s = await scraperJobStatus(countryJobId);
        if (stopped) return;
        setCountryStatus(s);
        if (s.status === 'done' || s.status === 'error' || s.status === 'cancelled') {
          if (s.status === 'done') toast.success(`Großer Scrape fertig: ${s.imported} neu, ${s.updated} aktualisiert (${s.found} gefunden).`);
          else if (s.status === 'cancelled') toast.success(`Großer Scrape gestoppt — ${s.imported} bereits importierte Leads bleiben erhalten.`);
          else toast.error(`Großer Scrape abgebrochen: ${s.error || 'Fehler'}`);
          getLeadLists().then(setLists);
          setCountryJobId(null);
          setCancelling(false);
          return;
        }
      } catch { /* transient — weiter pollen */ }
      if (!stopped) setTimeout(tick, 3000);
    };
    const t = setTimeout(tick, 2500);
    return () => { stopped = true; clearTimeout(t); };
  }, [countryJobId]);

  const listIdForName = (name: string): string | null => {
    if (name === NO_LIST) return null;
    return lists.find((l) => l.name === name)?.id ?? null;
  };

  const handleSearch = async () => {
    if (!location.trim()) { toast.error('Bitte einen Ort oder eine PLZ eingeben.'); return; }
    setSearching(true);
    setSearched(false);
    setCandidates([]);
    setSelected(new Set());
    try {
      const code = COUNTRIES.find((c) => c.label === searchCountryLabel)?.code || 'DE';
      const found = await scraperSearch(location.trim(), radiusKm, niche, code);
      setCandidates(found);
      setSelected(new Set(found.map((c) => c.externalRef))); // standardmäßig alle ausgewählt
      setSearched(true);
      if (found.length === 0) toast.info('Keine Treffer in diesem Umkreis.');
      else toast.success(`${found.length} Betriebe gefunden.`);
    } catch (e: any) {
      toast.error(e.message || 'Suche fehlgeschlagen');
    } finally {
      setSearching(false);
    }
  };

  const allSelected = candidates.length > 0 && candidates.every((c) => selected.has(c.externalRef));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(candidates.map((c) => c.externalRef)));
  const toggleOne = (ref: string) => setSelected((prev) => { const n = new Set(prev); if (n.has(ref)) n.delete(ref); else n.add(ref); return n; });

  const handleImport = async () => {
    const chosen = candidates.filter((c) => selected.has(c.externalRef));
    if (!chosen.length) { toast.error('Bitte mindestens einen Treffer auswählen.'); return; }
    setImporting(true);
    try {
      const r = await importScraped(chosen, listIdForName(targetList));
      const conf = r.conflicts || [];
      const conflictRefs = new Set(conf.map((c) => c.candidate.externalRef));
      const into = targetList === NO_LIST ? '' : ` → „${targetList}"`;
      if (r.imported || r.updated) toast.success(`${r.imported} neu, ${r.updated} aktualisiert${into}.`);
      // Erfolgreich importierte (ausgewählt & nicht in Konflikt) aus der Liste entfernen.
      setCandidates((prev) => prev.filter((c) => !(selected.has(c.externalRef) && !conflictRefs.has(c.externalRef))));
      setSelected((prev) => new Set([...prev].filter((ref) => conflictRefs.has(ref))));
      getLeadLists().then(setLists);
      if (conf.length) { setConflicts(conf); toast(`${conf.length} mögliche Dublette(n) — bitte entscheiden.`, { icon: '⚠️' }); }
    } catch (e: any) {
      toast.error(e.message || 'Import fehlgeschlagen');
    } finally {
      setImporting(false);
    }
  };

  const onConflictsResolved = (resolvedRefs: string[]) => {
    const set = new Set(resolvedRefs);
    setCandidates((prev) => prev.filter((c) => !set.has(c.externalRef)));
    setSelected((prev) => new Set([...prev].filter((ref) => !set.has(ref))));
    setConflicts([]);
    getLeadLists().then(setLists);
  };

  const createList = async () => {
    const name = window.prompt('Name der neuen Lead-Liste:');
    if (!name?.trim()) return;
    try {
      const l = await createLeadList(name.trim());
      if (l) { const updated = await getLeadLists(); setLists(updated); setTargetList(l.name); toast.success(`Liste „${l.name}" erstellt.`); }
    } catch (e: any) { toast.error(e.message || 'Liste konnte nicht erstellt werden'); }
  };

  const startCountry = async () => {
    const code = COUNTRIES.find((c) => c.label === countryLabel)?.code || 'DE';
    setCountryStarting(true);
    setCountryStatus(null);
    setCountryJobId(null);
    setCancelling(false);
    try {
      const { jobId, cities } = await countryScrape(code, niche, countryRadius);
      setCountryStatus({ status: 'running', processed: 0, total: cities, imported: 0, updated: 0, found: 0 });
      setCountryJobId(jobId); // startet das Polling (useEffect)
      toast.success(`Großer Scrape gestartet — ${cities} Städte in ${countryLabel}.`);
    } catch (e: any) {
      toast.error(e.message || 'Großer Scrape konnte nicht gestartet werden');
    } finally {
      setCountryStarting(false);
    }
  };

  const handleUrlCheck = async () => {
    if (!url.trim()) return;
    setUrlBusy(true);
    setUrlResult(null);
    try {
      const res: any = await evaluateWebsite(url.trim(), niche);
      const lead = res?.lead || {};
      setUrlResult({
        name: lead.companyName || url.trim(),
        website: lead.websiteUrl || url.trim(),
        phone: lead.phone,
        email: lead.email,
        externalRef: (lead.websiteUrl || url.trim()).replace(/^https?:\/\//, '').replace(/\/$/, ''),
        sourceUrl: lead.websiteUrl || url.trim(),
        niche,
        dealerType: niche === 'Gebrauchtteilehändler' ? 'gebrauchtteile' : 'neuteile',
        leadScore: res?.evaluation?.score,
      });
    } catch (e: any) {
      toast.error(e.message || 'Prüfung fehlgeschlagen');
    } finally {
      setUrlBusy(false);
    }
  };

  return (
    <div className={cn(SEITEN_RAND, 'space-y-5')}>
      <PageHeader
        title="Lead-Scraper"
        subtitle="Autoteilehändler per Region finden (OSM + Impressum), auswählen und als Leads ins CRM holen."
      />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border-subtle">
        {([['radius', Radar, 'Umkreissuche'], ['country', Map, 'Ganzes Land'], ['url', Globe, 'Einzelne URL']] as const).map(([key, Icon, label]) => (
          <button key={key} type="button" onClick={() => setTab(key)}
            className={cn('inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors',
              tab === key ? 'border-b-2 border-accent-500 text-accent-500' : 'text-text-muted hover:text-text-primary')}>
            <Icon className="size-4" />{label}
          </button>
        ))}
      </div>

      {tab === 'radius' && (
        <>
          {/* Suchformular */}
          <Card className="p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_180px_210px_160px_auto] md:items-end">
              <div>
                <SectionLabel className="mb-1.5 block">Region (Ort / PLZ)</SectionLabel>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
                  <input value={location} onChange={(e) => setLocation(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                    placeholder="z. B. Köln, München, 50667…"
                    className={cn(inputClass, 'h-10 pl-9')} />
                </div>
              </div>
              <div>
                <SectionLabel className="mb-1.5 block">Land</SectionLabel>
                <CustomSelect value={searchCountryLabel} onChange={setSearchCountryLabel} options={COUNTRIES.map((c) => c.label)} className="w-full" />
              </div>
              <div>
                <SectionLabel className="mb-1.5 block">Branche</SectionLabel>
                <CustomSelect value={niche} onChange={setNiche} options={NICHES} className="w-full" />
              </div>
              <div>
                <SectionLabel className="mb-1.5 block">Umkreis: {radiusKm} km</SectionLabel>
                <input type="range" min={1} max={50} value={radiusKm} onChange={(e) => setRadiusKm(parseInt(e.target.value))}
                  className="h-10 w-full cursor-pointer accent-accent-500" />
              </div>
              <Button onClick={handleSearch} disabled={searching} className="h-10">
                {searching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                {searching ? 'Suche…' : 'Suchen'}
              </Button>
            </div>
          </Card>

          {/* Trefferliste */}
          {candidates.length > 0 && (
            <Card className="overflow-visible">
              {/* Aktionsleiste */}
              <div className="flex flex-wrap items-center gap-3 border-b border-border-subtle p-3">
                <span className="text-sm text-text-secondary">
                  <strong className="text-text-primary">{selected.size}</strong> von {candidates.length} ausgewählt
                </span>
                <div className="ml-auto flex flex-wrap items-center gap-2">
                  <span className="text-xs text-text-muted">Importieren in:</span>
                  <CustomSelect value={targetList} onChange={setTargetList} options={[NO_LIST, ...lists.map((l) => l.name)]} className="w-44" />
                  <Button size="sm" variant="ghost" onClick={createList}><ListChecks className="size-4" />Neue Liste</Button>
                  <Button size="sm" onClick={handleImport} disabled={importing || selected.size === 0}>
                    {importing ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                    {importing ? 'Importiere…' : `${selected.size} importieren`}
                  </Button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-subtle bg-elevated/50">
                      <th className="w-10 px-4 py-3">
                        <CheckBox checked={allSelected} onChange={toggleAll} ariaLabel="Alle auswählen" />
                      </th>
                      <th className="label-technical px-4 py-3 text-left text-text-muted">Firma</th>
                      <th className="label-technical px-4 py-3 text-left text-text-muted">Telefon</th>
                      <th className="label-technical px-4 py-3 text-left text-text-muted">Website</th>
                      <th className="label-technical px-4 py-3 text-left text-text-muted">Adresse</th>
                      <th className="label-technical px-4 py-3 text-center text-text-muted">Erfasste Kontaktdaten</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {candidates.map((c) => {
                      const isSel = selected.has(c.externalRef);
                      return (
                        <tr key={c.externalRef} onClick={() => toggleOne(c.externalRef)}
                          className={cn('cursor-pointer transition-colors hover:bg-elevated', isSel && 'bg-accent-500/5')}>
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <CheckBox checked={isSel} onChange={() => toggleOne(c.externalRef)} ariaLabel={`${c.name} auswählen`} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-text-primary">{c.name}</div>
                            <div className="text-xs text-text-muted">{c.niche || ''}</div>
                          </td>
                          <td className="px-4 py-3">
                            {c.phone ? <span className="inline-flex items-center gap-1 text-text-secondary"><Phone className="size-3" />{c.phone}</span> : <span className="text-text-muted">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            {c.website ? (
                              <a href={safeWebsiteUrl(c.website)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-accent-500 hover:underline">
                                {c.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}<ExternalLink className="size-3" />
                              </a>
                            ) : <span className="text-text-muted">—</span>}
                          </td>
                          <td className="px-4 py-3 text-text-secondary">{c.address || <span className="text-text-muted">—</span>}</td>
                          <td className="px-4 py-3 text-center"><span className="text-sm text-text-secondary">{[c.phone && "Telefon", c.email && "E-Mail", c.website && "Website"].filter(Boolean).join(" · ") || "Kontakt fehlt"}<span className="mt-1 block text-xs text-text-muted">Noch nicht verifiziert</span></span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="border-t border-border-subtle px-4 py-2 text-xs text-text-muted">
                E-Mails werden beim Import automatisch aus dem Impressum der jeweiligen Website ergänzt.
              </p>
            </Card>
          )}

          {searched && candidates.length === 0 && !searching && (
            <Card><EmptyState icon={<Radar className="size-5" />} title="Keine Treffer" description="Größeren Umkreis wählen oder eine andere Branche/Region probieren." /></Card>
          )}
          {!searched && !searching && (
            <Card><EmptyState icon={<MapPin className="size-5" />} title="Region eingeben und suchen" description="Gib einen Ort oder eine PLZ ein — wir listen die Autoteilehändler im Umkreis auf. Du wählst aus, was ins CRM soll." /></Card>
          )}
        </>
      )}

      {/* ── Großer Scrape: ganzes Land ── */}
      {tab === 'country' && (
        <>
          <Card className="p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_200px_auto] md:items-end">
              <div>
                <SectionLabel className="mb-1.5 block">Land</SectionLabel>
                <CustomSelect value={countryLabel} onChange={setCountryLabel} options={COUNTRIES.map((c) => c.label)} className="w-full" />
              </div>
              <div>
                <SectionLabel className="mb-1.5 block">Branche</SectionLabel>
                <CustomSelect value={niche} onChange={setNiche} options={NICHES} className="w-full" />
              </div>
              <div>
                <SectionLabel className="mb-1.5 block">Umkreis je Stadt: {countryRadius} km</SectionLabel>
                <input type="range" min={5} max={50} value={countryRadius} onChange={(e) => setCountryRadius(parseInt(e.target.value))}
                  className="h-10 w-full cursor-pointer accent-accent-500" />
              </div>
              <Button onClick={startCountry} disabled={countryStarting || !!countryJobId} className="h-10">
                {(countryStarting || countryJobId) ? <Loader2 className="size-4 animate-spin" /> : <Map className="size-4" />}
                {countryJobId ? 'Läuft…' : countryStarting ? 'Starte…' : 'Land scrapen'}
              </Button>
            </div>
            <p className="mt-3 text-xs text-text-muted">
              Arbeitet das <strong className="text-text-secondary">ganze Land</strong> Stadt für Stadt ab: pro Stadt werden die Treffer geladen, sofort ins CRM übernommen und erst dann die nächste Stadt abgefragt (schont das Limit). Dubletten werden landesweit automatisch entfernt; die Leads erscheinen <strong className="text-text-secondary">laufend</strong> unter Leads → Scraping. Ein ganzes Land dauert einige Minuten — du kannst die Seite zwischendurch zumachen, der Lauf läuft im Hintergrund weiter.
            </p>
          </Card>

          {countryStatus ? (
            <CountryProgress
              status={countryStatus}
              cancelling={cancelling}
              onCancel={async () => {
                if (!countryJobId) return;
                setCancelling(true);
                try {
                  await cancelScraperJob(countryJobId);
                  toast.info('Stopp angefordert — der Lauf endet nach der aktuellen Stadt.');
                } catch (e: any) {
                  toast.error(e?.message || 'Job konnte nicht gestoppt werden');
                  setCancelling(false);
                }
              }}
            />
          ) : (
            <Card><EmptyState icon={<Map className="size-5" />} title="Landesweiter Scrape" description="Wähle ein Land und starte — wir arbeiten die Top-Städte automatisch ab und sammeln alle Händler in einer Gesamtliste. Das dauert je nach Land einige Minuten." /></Card>
          )}
        </>
      )}

      {/* ── Einzelne URL ── */}
      {tab === 'url' && (
        <Card className="p-4">
          <SectionLabel className="mb-1.5 block">Website-URL prüfen</SectionLabel>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleUrlCheck(); }}
              placeholder="https://beispiel.de" className={cn(inputClass, 'h-10 flex-1')} />
            <Button onClick={handleUrlCheck} disabled={urlBusy || !url.trim()} className="h-10">
              {urlBusy ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}{urlBusy ? 'Prüfe…' : 'Prüfen'}
            </Button>
          </div>
          {urlResult && (
            <div className="mt-4 rounded-md border border-border-subtle bg-elevated/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-text-primary">{urlResult.name}</div>
                  {urlResult.email && <div className="text-sm text-text-secondary">{urlResult.email}</div>}
                  {urlResult.phone && <div className="text-sm text-text-secondary">{urlResult.phone}</div>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="neutral">{urlResult.phone || urlResult.email ? "Kontaktweg erfasst" : "Kontakt fehlt"}</Badge>
                  <Button size="sm" onClick={async () => {
                    try { const r = await importScraped([urlResult], listIdForName(targetList)); toast.success(`${r.imported} importiert.`); setUrlResult(null); }
                    catch (e: any) { toast.error(e.message || 'Import fehlgeschlagen'); }
                  }}><Download className="size-4" />Als Lead importieren</Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {conflicts.length > 0 && (
        <DuplicateModal
          conflicts={conflicts}
          targetListName={targetList === NO_LIST ? null : targetList}
          targetListId={listIdForName(targetList)}
          onClose={() => setConflicts([])}
          onResolved={onConflictsResolved}
        />
      )}
    </div>
  );
}

/* ── Dubletten-Auflösung ──────────────────────────────────────────────── */
function DuplicateModal({ conflicts, targetListName, targetListId, onClose, onResolved }: {
  conflicts: ImportConflict[];
  targetListName: string | null;
  targetListId: string | null;
  onClose: () => void;
  onResolved: (resolvedRefs: string[]) => void;
}) {
  // Default 'merge' = sicherste Wahl (füllt nur leere Felder, verliert nichts).
  const [actions, setActions] = useState<Record<string, DuplicateAction>>(
    () => Object.fromEntries(conflicts.map((c) => [c.candidate.externalRef, 'merge' as DuplicateAction])),
  );
  const [busy, setBusy] = useState(false);
  const setAll = (a: DuplicateAction) => setActions(Object.fromEntries(conflicts.map((c) => [c.candidate.externalRef, a])));
  const MATCH_LABEL: Record<string, string> = { domain: 'gleiche Website', email: 'gleiche E-Mail', phone: 'gleiche Telefonnummer' };

  const apply = async () => {
    setBusy(true);
    try {
      const resolutions = conflicts.map((c) => ({ candidate: c.candidate, existingId: c.existing.id, action: actions[c.candidate.externalRef] || 'merge' }));
      const r = await resolveDuplicates(resolutions, targetListId);
      toast.success(`Dubletten verarbeitet: ${r.overwritten} überschrieben · ${r.merged} zusammengeführt · ${r.kept} behalten.`);
      onResolved(conflicts.map((c) => c.candidate.externalRef));
    } catch (e: any) {
      toast.error(e.message || 'Auflösung fehlgeschlagen');
    } finally {
      setBusy(false);
    }
  };

  const ACTS: { key: DuplicateAction; label: string }[] = [
    { key: 'keep', label: 'Bestehenden behalten' },
    { key: 'merge', label: 'Zusammenführen' },
    { key: 'overwrite', label: 'Neuen übernehmen' },
  ];

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title="Mögliche Dubletten gefunden"
      subtitle={`${conflicts.length} Treffer passen zu bestehenden Leads. Wähle pro Eintrag, was übernommen werden soll — es entsteht KEIN doppelter Datensatz.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Abbrechen</Button>
          <Button onClick={apply} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <GitMerge className="size-4" />}
            {busy ? 'Wende an…' : 'Entscheidung übernehmen'}
          </Button>
        </>
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-text-muted">Für alle:</span>
        {ACTS.map((a) => (
          <button key={a.key} type="button" onClick={() => setAll(a.key)}
            className="rounded-md border border-border-subtle bg-elevated px-2 py-1 text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary">
            {a.label}
          </button>
        ))}
        {targetListName && <span className="ml-auto text-text-muted">Ziel-Liste: „{targetListName}"</span>}
      </div>

      <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">
        {conflicts.map((c) => {
          const act = actions[c.candidate.externalRef] || 'merge';
          return (
            <div key={c.candidate.externalRef} className="rounded-md border border-border-subtle bg-elevated/40 p-3">
              <div className="mb-2 flex items-center gap-2">
                <AlertTriangle className="size-4 text-status-warning" />
                <span className="text-sm font-medium text-text-primary">{c.candidate.name}</span>
                <Badge tone="warning">{MATCH_LABEL[c.matchedBy] || c.matchedBy}</Badge>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ConflictCol title="Neu (gescrapt)" tone="accent" data={{ company: c.candidate.name, email: c.candidate.email, phone: c.candidate.phone, website: c.candidate.website }} />
                <ConflictCol title={`Bestehend · ${c.existing.source}`} tone="muted" data={{ company: c.existing.company, email: c.existing.email, phone: c.existing.phone, website: c.existing.website }} />
              </div>
              <div className="mt-3 inline-flex flex-wrap items-center gap-0.5 rounded-md border border-border-subtle bg-canvas p-0.5">
                {ACTS.map((a) => (
                  <button key={a.key} type="button"
                    onClick={() => setActions((prev) => ({ ...prev, [c.candidate.externalRef]: a.key }))}
                    className={cn('rounded px-2.5 py-1 text-xs font-medium transition-colors',
                      act === a.key ? 'bg-accent-500 text-white' : 'text-text-muted hover:text-text-primary')}>
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

function ConflictCol({ title, tone, data }: { title: string; tone: 'accent' | 'muted'; data: { company?: string; email?: string; phone?: string; website?: string } }) {
  return (
    <div className={cn('rounded-md border p-2.5', tone === 'accent' ? 'border-accent-500/30 bg-accent-500/5' : 'border-border-subtle bg-surface')}>
      <p className={cn('mb-1 text-[10px] font-medium uppercase tracking-wider', tone === 'accent' ? 'text-accent-500' : 'text-text-muted')}>{title}</p>
      <p className="truncate text-sm font-medium text-text-primary">{data.company || '—'}</p>
      <p className="truncate text-xs text-text-secondary">{data.email || '— keine E-Mail'}</p>
      <p className="truncate text-xs text-text-secondary">{data.phone || '— kein Telefon'}</p>
      <p className="truncate text-xs text-text-secondary">{data.website ? data.website.replace(/^https?:\/\//, '') : '— keine Website'}</p>
    </div>
  );
}

/* ── Fortschritt großer Scrape ──────────────────────────────────────────── */
function CountryProgress({ status, onCancel, cancelling }: { status: ScraperJobStatus; onCancel?: () => void; cancelling?: boolean }) {
  const pct = status.total ? Math.min(100, Math.round((status.processed / status.total) * 100)) : 0;
  const running = status.status === 'running' || status.status === 'queued';
  const tone = status.status === 'done' ? 'success' : status.status === 'error' ? 'danger' : status.status === 'cancelled' ? 'warning' : 'accent';
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {running
            ? <Loader2 className="size-4 animate-spin text-accent-500" />
            : status.status === 'done'
              ? <Check className="size-4 text-status-success" />
              : <X className="size-4 text-status-danger" />}
          <span className="text-sm font-medium text-text-primary">
            {running
              ? `Scrape läuft — ${status.processed}/${status.total} Städte abgearbeitet`
              : status.status === 'done'
                ? 'Großer Scrape abgeschlossen'
                : status.status === 'cancelled'
                  ? 'Großer Scrape gestoppt — bereits importierte Leads bleiben erhalten'
                  : 'Großer Scrape abgebrochen'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {running && onCancel && (
            <Button variant="secondary" size="sm" onClick={onCancel} disabled={cancelling}>
              <X className="size-4" />{cancelling ? 'Stoppe…' : 'Stoppen'}
            </Button>
          )}
          <Badge tone={tone}>{pct}%</Badge>
        </div>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-elevated">
        <div className={cn('h-full rounded-full transition-all duration-500', status.status === 'error' ? 'bg-status-danger' : 'bg-accent-500')}
          style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {([['Gefunden', status.found], ['Neu importiert', status.imported], ['Aktualisiert', status.updated]] as const).map(([label, value]) => (
          <div key={label} className="rounded-md border border-border-subtle bg-elevated/40 p-3 text-center">
            <div className="text-2xl font-semibold text-text-primary tabular-nums">{value}</div>
            <div className="label-technical mt-0.5 text-text-muted">{label}</div>
          </div>
        ))}
      </div>
      {status.error && <p className="mt-3 text-xs text-status-danger">{status.error}</p>}
      {running && <p className="mt-3 text-xs text-text-muted">Du kannst diese Ansicht offen lassen — die Leads erscheinen währenddessen schon unter „Leads → Scraping".</p>}
    </Card>
  );
}

function CheckBox({ checked, onChange, ariaLabel }: { checked: boolean; onChange: () => void; ariaLabel?: string }) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} aria-label={ariaLabel}
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      className={cn('flex size-[18px] shrink-0 items-center justify-center rounded border transition-colors',
        checked ? 'border-accent-500 bg-accent-500 text-white' : 'border-border-strong bg-canvas hover:border-accent-500')}>
      {checked && <Check className="size-3" strokeWidth={3} />}
    </button>
  );
}
