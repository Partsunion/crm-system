import type { Lead } from './storage';

export function timestamp(value?: string): number { const parsed = value ? Date.parse(value) : 0; return Number.isFinite(parsed) ? parsed : 0; }
export function localDayKey(date: Date): string { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
export function qualityOf(lead: Lead, now = Date.now()) {
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email?.trim() || '');
  const phone = (lead.phone || '').replace(/\D/g, '').length >= 6;
  const fields = [
    ['Firma', Boolean(lead.company?.trim())], ['Kontaktweg', email || phone], ['Ansprechpartner', Boolean(lead.contactPerson?.trim())],
    ['Händlerart', Boolean(lead.dealerType)], ['Standort', Boolean(lead.city?.trim())], ['Quelle', Boolean(lead.source?.trim())],
  ] as const;
  const missing = fields.filter(([, present]) => !present).map(([name]) => name);
  const last = Math.max(timestamp(lead.lastContactDate), timestamp(lead.lastEvaluatedAt), timestamp(lead.updatedAt), timestamp(lead.createdAt));
  return { missing, complete: fields.length - missing.length, total: fields.length, contactable: email || phone,
    stale: !last || now - last > 90 * 864e5, hasNextStep: timestamp(lead.nextFollowUpDate) > 0,
    label: missing.length === 0 ? 'Basis vollständig' : `${fields.length - missing.length}/${fields.length} Basisdaten`,
    explanation: missing.length ? `Fehlt: ${missing.join(', ')}. Kontaktwege sind erfasst, nicht extern verifiziert.` : 'Firma, Kontaktweg, Ansprechpartner, Händlerart, Standort und Quelle vorhanden. Kontaktwege sind nicht extern verifiziert.' };
}
export type QualityFilter = 'all' | 'complete' | 'no_contact' | 'missing_person' | 'no_next_step' | 'stale';
export function matchesQuality(lead: Lead, filter: QualityFilter, now = Date.now()): boolean {
  if (filter === 'all') return true;
  return matchesQualitySnapshot(qualityOf(lead, now), filter);
}
/** Reuse the same assessment for filter, count and table cell. */
export function matchesQualitySnapshot(quality: ReturnType<typeof qualityOf>, filter: QualityFilter): boolean {
  if (filter === 'complete') return quality.missing.length === 0;
  if (filter === 'no_contact') return !quality.contactable;
  if (filter === 'missing_person') return quality.missing.includes('Ansprechpartner');
  if (filter === 'no_next_step') return !quality.hasNextStep;
  if (filter === 'stale') return quality.stale;
  return true;
}
