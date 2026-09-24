import { useRef, useState } from 'react';
import { Check, Loader2, Plus, X } from 'lucide-react';
import { cn, IconButton, inputClass } from './ui-kit';

export function LeadQuickAdd({ onAdd, placeholder = 'Lead hinzufügen' }: { onAdd: (company: string) => Promise<void>; placeholder?: string }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = () => { if (lock.current) return; setOpen(false); setValue(''); setError(''); requestAnimationFrame(() => trigger.current?.focus()); };
  async function commit() {
    if (lock.current || !value.trim()) return;
    lock.current = true; setBusy(true); setError('');
    try { await onAdd(value.trim()); lock.current = false; close(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Lead konnte nicht angelegt werden. Eingabe bleibt erhalten.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <div className="space-y-2">
    {!open && <button ref={trigger} type="button" onClick={() => setOpen(true)} className="flex min-h-9 items-center gap-1.5 rounded-md px-2 text-sm text-text-muted transition-colors hover:bg-elevated hover:text-text-primary"><Plus className="size-4" aria-hidden />{placeholder}</button>}
    {open && <form onSubmit={event => { event.preventDefault(); void commit(); }} className="space-y-2">
      <div className="flex items-center gap-1.5">
        <input autoFocus aria-label="Firmenname für neuen Lead" aria-invalid={Boolean(error)} disabled={busy} value={value} maxLength={255} onChange={event => setValue(event.target.value)} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); } }} placeholder="Firmenname…" className={cn(inputClass, 'h-9 min-w-0')} />
        <IconButton type="submit" className="size-9 shrink-0" disabled={busy || !value.trim()} aria-label="Lead anlegen">{busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}</IconButton>
        <IconButton type="button" className="size-9 shrink-0" disabled={busy} onClick={close} aria-label="Anlegen abbrechen"><X className="size-4" /></IconButton>
      </div>
      {busy && <p role="status" className="text-xs text-text-muted">Lead wird angelegt…</p>}
      {error && <div role="alert" className="space-y-1 break-words text-xs text-status-danger"><p>{error}</p><p>Bei Verbindungsproblemen zuerst den Bestand prüfen, bevor du erneut anlegst.</p></div>}
    </form>}
  </div>;
}
