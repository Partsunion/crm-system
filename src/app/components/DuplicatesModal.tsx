/**
 * Dubletten-Prüfung — scannt den Lead-Bestand (Backend GET /leads/duplicates) und
 * lässt den Nutzer Gruppen wahrscheinlicher Dubletten zusammenführen. Beim Merge
 * werden Protokoll/Termine/Listen des Duplikats an den gewählten Haupt-Lead
 * umgehängt und das Duplikat archiviert (kein Datenverlust).
 */
import { useCallback, useEffect, useState } from 'react';
import { Loader2, Merge, ShieldCheck, ShieldAlert, Phone, Mail, Globe, MapPin, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Modal, Button, Badge, EmptyState, cn } from './ui-kit';
import { getDuplicateGroups, mergeLeads, type DuplicateGroup } from '../utils/storage';

const REASON_LABEL: Record<string, string> = {
  phone: 'Gleiche Telefonnummer',
  domain: 'Gleiche Web-Domain',
  email: 'Gleiche E-Mail-Domain',
  name: 'Gleicher Firmenname',
};

function relDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('de-DE');
}

export function DuplicatesModal({ onClose, onMerged }: { onClose: () => void; onMerged?: () => void }) {
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [scanned, setScanned] = useState(0);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getDuplicateGroups();
      setGroups(r.groups);
      setScanned(r.scanned);
    } catch (e: any) {
      toast.error(e.message || 'Dubletten-Scan fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <Modal
      onClose={onClose}
      size="xl"
      title="Dubletten prüfen"
      subtitle={loading ? 'Bestand wird gescannt…' : `${groups.length} mögliche Dublette${groups.length === 1 ? '' : 'n'} · ${scanned} Leads geprüft`}
      footer={<div className="flex justify-end"><Button variant="secondary" onClick={onClose}>Schließen</Button></div>}
      bodyClassName="space-y-4"
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-text-muted">
          <Loader2 className="size-4 animate-spin" />Bestand wird auf Dubletten geprüft…
        </div>
      ) : groups.length === 0 ? (
        <EmptyState icon={<CheckCircle2 className="size-5" />} title="Keine Dubletten gefunden" description="Im aktuellen Lead-Bestand wurden keine wahrscheinlichen Doppel-Einträge erkannt." />
      ) : (
        groups.map((g, i) => (
          <DuplicateGroupCard
            key={i}
            group={g}
            busy={busyKey === String(i)}
            onMerge={async (primaryId, mergeIds) => {
              setBusyKey(String(i));
              try {
                const r = await mergeLeads(primaryId, mergeIds);
                toast.success(`${r.merged} Duplikat${r.merged === 1 ? '' : 'e'} zusammengeführt.`);
                onMerged?.();
                await load();
              } catch (e: any) {
                toast.error(e.message || 'Zusammenführen fehlgeschlagen');
              } finally {
                setBusyKey(null);
              }
            }}
          />
        ))
      )}
    </Modal>
  );
}

function DuplicateGroupCard({
  group,
  busy,
  onMerge,
}: {
  group: DuplicateGroup;
  busy: boolean;
  onMerge: (primaryId: string, mergeIds: string[]) => void;
}) {
  // Default: der Datensatz mit dem meisten Protokoll ist der Haupt-Lead (steht
  // durch die Backend-Sortierung vorn). Alle anderen sind zum Merge vorgewählt.
  const [primaryId, setPrimaryId] = useState(group.members[0]?.id);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(group.members.slice(1).map((m) => m.id)),
  );

  const toggle = (id: string) =>
    setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  // Haupt-Lead nie „zum Zusammenführen" markiert.
  const mergeIds = [...selected].filter((id) => id !== primaryId);
  const strong = group.confidence === 'high';

  return (
    <div className="rounded-xl border border-border-subtle bg-elevated/30 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge tone={strong ? 'success' : 'warning'}>
          {strong ? <ShieldCheck className="mr-1 inline size-3" /> : <ShieldAlert className="mr-1 inline size-3" />}
          {strong ? 'Sicher' : 'Möglich'}
        </Badge>
        {group.reasons.map((r) => (
          <span key={r} className="rounded-full border border-border-subtle bg-canvas px-2 py-0.5 text-[11px] text-text-secondary">
            {REASON_LABEL[r] || r}
          </span>
        ))}
        <span className="ml-auto text-xs text-text-muted">{group.members.length} Einträge</span>
      </div>

      <div className="space-y-1.5">
        {group.members.map((m) => {
          const isPrimary = m.id === primaryId;
          return (
            <div
              key={m.id}
              className={cn(
                'flex items-start gap-3 rounded-lg border p-2.5 transition-colors',
                isPrimary ? 'border-accent-500/40 bg-accent-500/5' : 'border-border-subtle bg-canvas',
              )}
            >
              <label className="mt-0.5 flex cursor-pointer items-center" title="Als Haupt-Lead behalten">
                <input
                  type="radio"
                  name={`primary-${group.members[0]?.id}`}
                  checked={isPrimary}
                  onChange={() => { setPrimaryId(m.id); setSelected((prev) => { const n = new Set(prev); n.delete(m.id); return n; }); }}
                  className="size-4 accent-accent-500"
                />
              </label>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-medium text-text-primary">{m.company || '—'}</span>
                  {isPrimary && <Badge tone="accent">Haupt-Lead</Badge>}
                  <Badge tone="neutral">{m.status}</Badge>
                  {m.source && <span className="text-[11px] text-text-muted">{m.source}</span>}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
                  {m.contactPerson && <span>{m.contactPerson}</span>}
                  {m.phone && <span className="inline-flex items-center gap-1"><Phone className="size-3" />{m.phone}</span>}
                  {m.email && <span className="inline-flex items-center gap-1"><Mail className="size-3" />{m.email}</span>}
                  {m.website && <span className="inline-flex items-center gap-1"><Globe className="size-3" />{m.website.replace(/^https?:\/\//, '')}</span>}
                  {m.city && <span className="inline-flex items-center gap-1"><MapPin className="size-3" />{m.city}</span>}
                </div>
                <div className="mt-1 text-[11px] text-text-muted">
                  {m.activityCount} Aktivität{m.activityCount === 1 ? '' : 'en'} · Kontakt: {relDate(m.lastContactDate)} · angelegt {relDate(m.createdAt)}
                </div>
              </div>
              {!isPrimary && (
                <label className="mt-0.5 flex cursor-pointer items-center gap-1.5 text-xs text-text-secondary" title="In den Haupt-Lead zusammenführen">
                  <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggle(m.id)} className="size-4 accent-accent-500" />
                  zusammenführen
                </label>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-xs text-text-muted">
          Ausgewählte Einträge werden in den Haupt-Lead überführt (Protokoll, Termine &amp; Listen bleiben erhalten) und archiviert.
        </p>
        <Button size="sm" onClick={() => onMerge(primaryId, mergeIds)} disabled={busy || mergeIds.length === 0}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Merge className="size-4" />}
          {mergeIds.length > 0 ? `${mergeIds.length} zusammenführen` : 'Zusammenführen'}
        </Button>
      </div>
    </div>
  );
}
