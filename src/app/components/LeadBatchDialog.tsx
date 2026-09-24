import { useRef, useState } from 'react';
import { deleteLead, saveLead, type Lead } from '../utils/storage';
import { runBatch, type BatchOutcome } from '../utils/batchWork';
import { useWorkspaceGuard } from '../utils/useWorkspaceGuard';
import { Button, Modal } from './ui-kit';

export type LeadBatchOperation = { kind: 'delete' } | { kind: 'assign'; username: string | null };
type Target = Pick<Lead, 'id' | 'company'>;

export function LeadBatchDialog({ targets, operation, onClose, onResult }: {
  targets: Target[];
  operation: LeadBatchOperation;
  onClose: () => void;
  onResult: (outcomes: BatchOutcome<Target>[]) => void;
}) {
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [progress, setProgress] = useState({ completed: 0, total: targets.length });
  const [outcomes, setOutcomes] = useState<BatchOutcome<Target>[] | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  useWorkspaceGuard(false, busy);
  const failures = outcomes?.filter((result) => !result.ok) || [];
  const succeeded = outcomes?.filter((result) => result.ok).length || 0;
  const deleting = operation.kind === 'delete';
  const title = deleting ? 'Leads löschen' : 'Zuständigkeit ändern';
  const close = () => { if (!lock.current) onClose(); };

  async function submit(items: Target[]) {
    if (lock.current || (deleting && !confirmed)) return;
    lock.current = true;
    setBusy(true);
    setProgress({ completed: 0, total: items.length });
    try {
      const results = await runBatch(items, (lead) => deleting
        ? deleteLead(lead.id)
        : saveLead({ id: lead.id, assignedTo: operation.kind === 'assign' ? operation.username || '' : '' }),
      (completed, total) => setProgress({ completed, total }));
      const byId = new Map(results.map((result) => [result.item.id, result]));
      setOutcomes((previous) => previous ? previous.map((result) => byId.get(result.item.id) || result) : results);
      onResult(results);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return <Modal title={title} subtitle={`${targets.length} ausgewählte ${targets.length === 1 ? 'Firma' : 'Firmen'}`} onClose={close}
    footer={<>
      <Button variant="secondary" disabled={busy} onClick={close}>{outcomes ? 'Ergebnis schließen' : 'Abbrechen'}</Button>
      {!outcomes && <Button variant={deleting ? 'danger' : 'primary'} disabled={busy || (deleting && !confirmed)} onClick={() => void submit(targets)}>
        {busy ? 'Wird bearbeitet…' : deleting ? `${targets.length} Leads löschen` : 'Zuständigkeit speichern'}
      </Button>}
      {failures.length > 0 && <Button variant="secondary" disabled={busy} onClick={() => void submit(failures.map((result) => result.item))}>Nur fehlgeschlagene erneut versuchen</Button>}
    </>}>
    <div className="space-y-4" aria-busy={busy}>
      {!outcomes && <>
        <p className="text-sm leading-6 text-text-secondary">{deleting
          ? 'Prüfe die Auswahl vor dem Löschen. Diese Aktion kann hier nicht rückgängig gemacht werden.'
          : operation.kind === 'assign' && operation.username ? `Neue Zuständigkeit: ${operation.username}. Andere Lead-Daten bleiben unverändert.` : 'Die persönliche Zuständigkeit wird entfernt. Andere Lead-Daten bleiben unverändert.'}</p>
        <ul className="max-h-52 divide-y divide-border-subtle overflow-y-auto rounded-md border border-border-subtle" aria-label="Betroffene Firmen">
          {targets.map((lead) => <li key={lead.id} className="px-3 py-2 text-sm">{lead.company}</li>)}
        </ul>
        {deleting && <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1 size-4" checked={confirmed} disabled={busy} onChange={(event) => setConfirmed(event.target.checked)} />Ich habe die Firmenauswahl geprüft und möchte diese Leads löschen.</label>}
      </>}
      {busy && <div role="status" className="space-y-2 text-sm"><p>{progress.completed} von {progress.total} Rückmeldungen eingegangen. Bitte diese Ansicht geöffnet lassen.</p><progress className="h-2 w-full accent-accent-500" aria-label="Bearbeitungsfortschritt" value={progress.completed} max={progress.total} /></div>}
      {outcomes && <div role="status" className="rounded-md border border-border-subtle bg-elevated p-3 text-sm">{succeeded} von {targets.length} Änderungen bestätigt.{failures.length > 0 ? ` ${failures.length} nicht bestätigt; diese Leads bleiben ausgewählt.` : ' Alle ausgewählten Leads wurden bearbeitet.'}</div>}
      {failures.length > 0 && <>
        <p className="text-sm leading-6 text-text-secondary">Bei einem Verbindungsabbruch kann eine Änderung bereits gespeichert sein. Prüfe den aktuellen Stand vor einer erneuten Aktion. Bestätigte Änderungen werden nicht erneut ausgeführt.</p>
        <ul className="divide-y divide-border-subtle rounded-md border border-status-danger/30" aria-label="Nicht bestätigte Änderungen">{failures.map((result) => <li key={result.item.id} className="px-3 py-3 text-sm"><p className="font-medium">{result.item.company}</p><p className="mt-1 break-words text-status-danger">{!result.ok && result.error}</p></li>)}</ul>
      </>}
    </div>
  </Modal>;
}
