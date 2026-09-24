import { useEffect, useState, useRef } from 'react';
import { defaultOpenStage } from '../utils/stages';
import { X, Plus } from 'lucide-react';
import { type Lead, getSettings, getStatusOptions, getAppointmentAdmins } from '../utils/storage';
import { CustomSelect } from './CustomSelect';
import { Modal, Button, Field, Badge, inputClass, cn } from './ui-kit';
import { useWorkspaceGuard } from '../utils/useWorkspaceGuard';

interface LeadModalProps {
  lead: Lead | null;
  onClose: () => void;
  onSave: (lead: Partial<Lead>) => Promise<void> | void;
  /** Wenn gesetzt: Zurück-Pfeil oben links (zurück zur Aktivitäten-Ansicht). */
  onBack?: () => void;
}

export function LeadModal({ lead, onClose, onSave, onBack }: LeadModalProps) {
  const settings = getSettings();
  const [formData, setFormData] = useState({
    company: lead?.company || '',
    contactPerson: lead?.contactPerson || '',
    email: lead?.email || '',
    phone: lead?.phone || '',
    website: lead?.website || '',
    industry: lead?.industry || '',
    city: lead?.city || '',
    country: lead?.country || 'DE',
    dealerType: lead?.dealerType,
    address: lead?.address || '',
    status: lead?.status || defaultOpenStage(),
    source: lead?.source || 'Manuell',
    value: lead?.value || 0,
    priority: lead?.priority || 'Mittel',
    assignedTo: lead?.assignedTo || '',
    notes: lead?.notes || '',
    tags: lead?.tags || [],
    leadScore: lead?.leadScore || 0,
    nextFollowUpDate: lead?.nextFollowUpDate || '',
  });
  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const saveErrorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (saveError) { saveErrorRef.current?.focus(); saveErrorRef.current?.scrollIntoView?.({ block: 'nearest' }); } }, [saveError]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  useWorkspaceGuard(dirty, saving);
  const close = () => { if (!saving && (!dirty || window.confirm('Ungespeicherte Änderungen verwerfen?'))) onClose(); };
  // Echte Admin-Accounts für die Zuteilung (statt Freitext — Tippfehler machten
  // Leads im Benutzer-Filter unauffindbar). Ein evtl. Alt-Wert bleibt wählbar.
  const NO_ASSIGNEE = '— nicht zugewiesen —';
  const [adminNames, setAdminNames] = useState<string[]>([]);
  useEffect(() => {
    getAppointmentAdmins().then((a) => setAdminNames(a.map((x) => x.username)));
  }, []);
  const assigneeOptions = [
    NO_ASSIGNEE,
    ...adminNames,
    ...(formData.assignedTo && !adminNames.includes(formData.assignedTo) ? [formData.assignedTo] : []),
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const errors: Record<string, string> = {};
    if (!formData.company.trim()) errors.company = 'Bitte den Firmennamen eintragen.';
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) errors.email = 'Bitte eine gültige E-Mail-Adresse eintragen.';
    if (formData.value < 0 || !Number.isFinite(formData.value)) errors.value = 'Der geschätzte Wert muss mindestens 0 sein.';
    setFieldErrors(errors); setSaveError('');
    if (Object.keys(errors).length) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('#lead-form [aria-invalid="true"]')?.focus());
      return;
    }
    setSaving(true);
    try { await onSave({ ...lead, ...formData, company: formData.company.trim(), email: formData.email.trim() }); setDirty(false); }
    catch (error) { setSaveError(error instanceof Error ? error.message : 'Speichern fehlgeschlagen. Deine Eingaben bleiben erhalten.'); }
    finally { setSaving(false); }
  };

  const handleChange = (field: string, value: unknown) => { setDirty(true); setFormData((prev) => ({ ...prev, [field]: value })); setFieldErrors((prev) => ({ ...prev, [field]: '' })); };

  const addTag = () => {
    const t = newTag.trim();
    if (t && !formData.tags.includes(t)) {
      handleChange('tags', [...formData.tags, t]);
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => handleChange('tags', formData.tags.filter((t) => t !== tag));

  return (
    <Modal
      onClose={close}
      onBack={onBack ? () => { if (!saving && (!dirty || window.confirm('Ungespeicherte Änderungen verwerfen?'))) onBack(); } : undefined}
      title={lead ? 'Lead bearbeiten' : 'Neuer Lead'}
      subtitle={onBack ? 'Stammdaten — zurück zu den Aktivitäten oben links.' : 'Geben Sie die Lead-Details ein.'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={saving}>
            Abbrechen
          </Button>
          <Button type="submit" form="lead-form" disabled={saving}>
            {saving ? 'Wird gespeichert…' : lead ? 'Änderungen speichern' : 'Lead erstellen'}
          </Button>
        </>
      }
    >
      <form id="lead-form" noValidate onSubmit={handleSubmit} className="space-y-6" aria-busy={saving}>
        {saveError && <p ref={saveErrorRef} tabIndex={-1} role="alert" className="rounded-md border border-status-danger/30 p-3 text-sm text-status-danger">{saveError} Bitte erneut versuchen.</p>}
        <fieldset disabled={saving} className="space-y-6">
        <p className="text-sm text-text-secondary">Beginne mit Firma und Kontakt. Weitere Stammdaten kannst du später ergänzen.</p>
        {/* Basis */}
        <section className="space-y-4">
          <h4 className="label-technical text-text-muted">Basisinformationen</h4>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Firma / Händler" required>
              {fieldErrors.company && <p id="company-error" role="alert" className="text-sm text-status-danger">{fieldErrors.company}</p>}
              <input
                type="text"
                required aria-invalid={Boolean(fieldErrors.company)} aria-describedby={fieldErrors.company ? "company-error" : undefined}
                value={formData.company}
                onChange={(e) => handleChange('company', e.target.value)}
                placeholder="z.B. Müller Autoteile GmbH"
                className={cn(inputClass, 'h-9')}
              />
            </Field>
            <Field label="Kontaktperson">
              <input
                type="text"
                value={formData.contactPerson}
                onChange={(e) => handleChange('contactPerson', e.target.value)}
                placeholder="z.B. Max Mustermann"
                className={cn(inputClass, 'h-9')}
              />
            </Field>
            <Field label="E-Mail">
              {fieldErrors.email && <p id="email-error" role="alert" className="text-sm text-status-danger">{fieldErrors.email}</p>}
              <input
                type="email"
                aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? "email-error" : undefined}
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="max@beispiel.de"
                className={cn(inputClass, 'h-9')}
              />
            </Field>
            <Field label="Telefon">
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+49 123 456789"
                className={cn(inputClass, 'h-9')}
              />
            </Field>
            <Field label="Website">
              <input
                type="url"
                value={formData.website}
                onChange={(e) => handleChange('website', e.target.value)}
                placeholder="https://www.beispiel.de"
                className={cn(inputClass, 'h-9')}
              />
            </Field>
            <Field label="Branche">
              <CustomSelect
                value={formData.industry}
                onChange={(value) => handleChange('industry', value)}
                options={settings.industries}
                placeholder="Branche wählen…"
              />
            </Field>
            <Field label="Händlerart">
              <CustomSelect
                value={formData.dealerType ? ({ neuteile: 'Neuteilehändler', gebrauchtteile: 'Gebrauchtteilehändler', verwerter: 'Verwerter', werkstatt: 'Werkstatt', mischbetrieb: 'Mischbetrieb' })[formData.dealerType] : 'Noch einordnen'}
                onChange={(value) => handleChange('dealerType', ({ Neuteilehändler: 'neuteile', Gebrauchtteilehändler: 'gebrauchtteile', Verwerter: 'verwerter', Werkstatt: 'werkstatt', Mischbetrieb: 'mischbetrieb' } as Record<string, string>)[value])}
                options={['Noch einordnen', 'Neuteilehändler', 'Gebrauchtteilehändler', 'Verwerter', 'Werkstatt', 'Mischbetrieb']}
              />
            </Field>
          </div>
        </section>

        {/* Adresse */}
        <section className="space-y-4 border-t border-border-subtle pt-5">
          <h4 className="label-technical text-text-muted">Adressinformationen</h4>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Adresse" className="md:col-span-2">
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Straße und Hausnummer"
                className={cn(inputClass, 'h-9')}
              />
            </Field>
            <Field label="Stadt">
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                placeholder="z.B. München"
                className={cn(inputClass, 'h-9')}
              />
            </Field>
            <Field label="Land">
              <CustomSelect
                value={({ DE: 'Deutschland', AT: 'Österreich', CH: 'Schweiz', FR: 'Frankreich', PL: 'Polen' } as Record<string, string>)[formData.country] || formData.country || 'Deutschland'}
                onChange={(value) => handleChange('country', ({ Deutschland: 'DE', Österreich: 'AT', Schweiz: 'CH', Frankreich: 'FR', Polen: 'PL' } as Record<string, string>)[value] || value)}
                options={['Deutschland', 'Österreich', 'Schweiz', 'Frankreich', 'Polen']}
              />
            </Field>
          </div>
        </section>

        {/* Vertrieb */}
        <section className="space-y-4 border-t border-border-subtle pt-5">
          <h4 className="label-technical text-text-muted">Vertriebsinformationen</h4>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Status">
              <CustomSelect value={formData.status} onChange={(v) => handleChange('status', v)} options={getStatusOptions()} />
            </Field>
            <Field label="Quelle">
              <CustomSelect value={formData.source} onChange={(v) => handleChange('source', v)} options={settings.sources} />
            </Field>
            <Field label="Geschätzter Wert (€)">
              {fieldErrors.value && <p role="alert" className="text-sm text-status-danger">{fieldErrors.value}</p>}
              <input
                type="number"
                min="0"
                value={formData.value}
                onChange={(e) => handleChange('value', Number(e.target.value))}
                placeholder="z.B. 5000"
                className={cn(inputClass, 'h-9')}
              />
            </Field>
            <Field label="Priorität">
              <CustomSelect value={formData.priority} onChange={(v) => handleChange('priority', v)} options={['Niedrig', 'Mittel', 'Hoch']} />
            </Field>
            <Field label="Zugewiesen an">
              <CustomSelect
                value={formData.assignedTo || NO_ASSIGNEE}
                onChange={(v) => handleChange('assignedTo', v === NO_ASSIGNEE ? '' : v)}
                options={assigneeOptions}
              />
            </Field>
            <Field label="Nächstes Follow-up">
              <input
                type="date"
                value={formData.nextFollowUpDate}
                onChange={(e) => handleChange('nextFollowUpDate', e.target.value)}
                className={cn(inputClass, 'h-9')}
              />
            </Field>
            <p className="self-end text-sm text-text-muted">Die Datenqualität ergibt sich aus den erfassten Basisdaten. Priorität und nächster Schritt werden separat gepflegt.</p>
          </div>
        </section>

        {/* Tags */}
        <section className="space-y-3 border-t border-border-subtle pt-5">
          <h4 className="label-technical text-text-muted">Tags</h4>
          {formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag) => (
                <Badge key={tag} tone="accent">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="ml-0.5 hover:text-text-primary">
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              placeholder="Neues Tag hinzufügen…"
              className={cn(inputClass, 'h-9')}
            />
            <Button type="button" variant="secondary" onClick={addTag} className="shrink-0 px-3" aria-label="Tag hinzufügen">
              <Plus className="size-4" />
            </Button>
          </div>
        </section>

        {/* Notizen */}
        <section className="space-y-3 border-t border-border-subtle pt-5">
          <h4 className="label-technical text-text-muted">Notizen</h4>
          <textarea
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows={4}
            placeholder="Zusätzliche Informationen über den Lead…"
            className={cn(inputClass, 'resize-none py-2')}
          />
        </section>
        </fieldset>
      </form>
    </Modal>
  );
}
