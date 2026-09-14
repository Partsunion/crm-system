import { CalendarClock, Mail, Pencil, Trash2 } from 'lucide-react';
import { CallButton } from '../phone/PhoneUI';
import type { Lead } from '../utils/storage';
import { qualityOf, timestamp } from '../utils/leadQuality';
import { Card, IconButton, StatusSelect } from './ui-kit';

export function LeadMobileCard({ lead, selected, statuses, due, onSelect, onOpen, onEdit, onDelete, onStatus }: {
  lead: Lead; selected: boolean; statuses: string[]; due: boolean;
  onSelect: () => void; onOpen: () => void; onEdit: () => void; onDelete: () => void; onStatus: (status: string) => void;
}) {
  const quality = qualityOf(lead);
  const followUp = timestamp(lead.nextFollowUpDate);
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email?.trim() || '') ? lead.email.trim() : null;
  const phone = (lead.phone || '').replace(/[^\d+]/g, '');
  return <Card className="overflow-hidden">
    <div className="flex items-start gap-3 p-4">
      <input type="checkbox" className="mt-1 size-4 shrink-0 accent-accent-500" checked={selected} onChange={onSelect} aria-label={`${lead.company} auswählen`} />
      <div className="min-w-0 flex-1">
        <button onClick={onOpen} aria-label={`Lead ${lead.company} öffnen`} className="block max-w-full break-words text-left text-sm font-semibold text-text-primary hover:text-accent-500 focus-visible:underline">{lead.company}</button>
        <p className="mt-1 text-xs text-text-muted">{[lead.contactPerson, lead.city].filter(Boolean).join(' · ') || 'Ansprechpartner und Standort offen'}</p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {email && <a className="inline-flex min-w-0 items-center gap-1.5 text-accent-500" href={`mailto:${email}`}><Mail className="size-3.5 shrink-0" /><span className="break-all">{email}</span></a>}
          {phone.replace(/\D/g, '').length >= 6 && <CallButton lead={lead} compact />}
          {!quality.contactable && <span className="text-text-muted">Kein nutzbarer Kontaktweg erfasst</span>}
        </div>
      </div>
    </div>
    <div className="space-y-3 border-t border-border-subtle px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><StatusSelect value={lead.status} options={statuses} onChange={onStatus} /><span className="text-xs text-text-secondary">{lead.assignedTo || 'Nicht zugewiesen'}</span></div>
      <div className="flex items-start gap-2 text-sm"><CalendarClock className="mt-0.5 size-4 shrink-0 text-text-muted" /><div><p className={due ? 'font-medium text-status-warning' : 'font-medium'}>{followUp ? `${due ? 'Fällig: ' : 'Nächster Schritt: '}${new Date(followUp).toLocaleDateString('de-DE')}` : 'Nächster Schritt fehlt'}</p><p className="mt-1 text-xs text-text-muted" title={quality.explanation}>{quality.missing.length ? `${quality.complete}/${quality.total} Basisdaten · ${quality.missing.slice(0, 2).join(', ')} fehlt` : 'Basisdaten vollständig · nicht extern verifiziert'}</p></div></div>
    </div>
    <div className="flex items-center justify-between border-t border-border-subtle px-4 py-2"><button onClick={onOpen} className="min-h-9 text-sm font-medium text-accent-500">Lead bearbeiten</button><div className="flex gap-1"><IconButton onClick={onEdit} aria-label={`Stammdaten von ${lead.company} bearbeiten`}><Pencil className="size-4" /></IconButton><IconButton tone="danger" onClick={onDelete} aria-label={`${lead.company} löschen`}><Trash2 className="size-4" /></IconButton></div></div>
  </Card>;
}
