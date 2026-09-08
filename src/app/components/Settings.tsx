/**
 * Einstellungen — Status, Quellen, Branchen, Etiketten, Firmenangaben.
 *
 * ─── Was hier geändert wurde und warum ─────────────────────────────────────
 *
 * DICHTE. Jede der vier Listen trug einen Kopf von rund 90 px, bevor der
 * erste Eintrag kam: ein 40-px-Symbolfeld, Titel, Unterzeile, Trennlinie,
 * dazu 20 px Abstand. Die Einträge selbst waren 44 px hoch. Acht Status
 * ergaben so eine Karte von über 450 px — für acht Wörter. Auf einem
 * 13-Zoll-Bildschirm passte keine zweite Karte daneben ins Bild.
 *
 * Jetzt: Symbol 28 px in der Titelzeile, keine Trennlinie, Einträge 30 px.
 * Die Abstände kommen aus dichte.ts wie überall sonst.
 *
 * DIE NUMMER VOR JEDEM EINTRAG ist weg. Sie sah nach Reihenfolge aus, aber
 * man konnte nichts umsortieren — die Zahl war reine Zählerei und behauptete
 * eine Bedeutung, die es nicht gab. (Umsortieren gibt es, aber in den
 * Pipeline-Einstellungen, und dort mit Pfeilen.)
 *
 * ZWEI SPEICHERN-KNÖPFE wurden zu einem. Oben und unten stand derselbe Knopf
 * mit derselben Wirkung, unten nur mit anderer Aufschrift („Alle
 * Einstellungen speichern"), was aussah, als täte er etwas anderes.
 *
 * ─── Zwei Fehler, die nichts mit dem Aussehen zu tun hatten ────────────────
 *
 * 1. Der Speichern-Knopf meldete IMMER Erfolg. `saveSettings` gab nichts
 *    zurück und prüfte die Antwort des Servers nicht. Wem `settings.write`
 *    fehlt, der bekam „Einstellungen gespeichert" und fand seine Änderung
 *    beim nächsten Laden nicht wieder — weil beim Start der Serverstand den
 *    lokalen überschreibt. Siehe utils/einstellungenSichern.ts.
 *
 * 2. Beim Entfernen eines Status wurde nur gefragt, ob man das wirklich will.
 *    Nicht aber, dass Leads in diesem Status danach mit einem Status
 *    dastehen, den es nicht mehr gibt — sie bekommen dann eine Farbe aus dem
 *    Hash und tauchen in keinem Filter mehr auf. Jetzt steht in der Frage,
 *    wie viele Leads es trifft.
 */
import { useState } from 'react';
import { PhoneSettingsCard } from '../phone/PhoneUI';
import { CrmMailSettings } from './LeadEmailComposer';
import { Plus, Trash2, Save, Tag, Package, Briefcase, ListChecks, Check } from 'lucide-react';
import { toast } from 'sonner';
import { getSettings, getLeads, getCurrentUser, type Settings as SettingsType } from '../utils/storage';
import { useWorkspaceGuard } from '../utils/useWorkspaceGuard';
import { einstellungenSichern } from '../utils/einstellungenSichern';
import { Button, Card, Field, IconButton, PageHeader, SEITEN_RAND, cn, inputClass } from './ui-kit';
import { KARTE_INNEN, LEER_INNEN } from './dichte';

type ListKey = 'statuses' | 'sources' | 'industries' | 'tags';

export function Settings() {
  const [settings, setSettings] = useState<SettingsType>(getSettings());
  const [saved, setSaved] = useState(false);
  const [speichert, setSpeichert] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(getSettings()));
  const [section, setSection] = useState<'phone'|'mail'|'fields'|'company'>('phone');
  const dirty = JSON.stringify(settings) !== savedSnapshot;
  const canManage = getCurrentUser()?.role === 'manager' || Boolean(getCurrentUser()?.app_access?.admin);
  useWorkspaceGuard(dirty, speichert);
  /**
   * Wie viele Leads hängen an welchem Status.
   *
   * Wird NICHT beim Öffnen der Seite geholt, sondern erst beim ersten Klick
   * auf ein Mülleimer-Symbol. Die Leadliste sind 405 KB — die für eine
   * Zahl zu laden, die die meisten nie brauchen, wäre verschwendet. Wer
   * vorher schon in den Leads war, hat sie ohnehin im Zwischenspeicher, und
   * dann kostet der Abruf hier gar nichts.
   */
  const [belegung, setBelegung] = useState<Record<string, number> | null>(null);

  const handleSave = async () => {
    setSpeichert(true);
    const ok = await einstellungenSichern(settings, 'Einstellungen gespeichert.');
    setSpeichert(false);
    if (!ok) return;
    setSavedSnapshot(JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addItem = (key: ListKey, value: string) => {
    if (!value) return;
    if (settings[key].includes(value)) {
      toast.error(`„${value}" gibt es schon.`);
      return;
    }
    setSettings((prev) => ({ ...prev, [key]: [...prev[key], value] }));
  };

  /** Zählt Leads je Status — einmal, dann gemerkt. */
  const belegungHolen = async (): Promise<Record<string, number>> => {
    if (belegung) return belegung;
    const zaehler: Record<string, number> = {};
    for (const l of await getLeads()) if (l.status) zaehler[l.status] = (zaehler[l.status] ?? 0) + 1;
    setBelegung(zaehler);
    return zaehler;
  };

  const removeItem = async (key: ListKey, value: string, label: string) => {
    // Bei Status: sagen, was daran hängt. Ein Lead mit einem Status, den es
    // nicht mehr gibt, behält ihn — taucht aber in keinem Filter mehr auf.
    // Das darf man nicht aus Versehen tun.
    let betroffen = 0;
    try { betroffen = key === 'statuses' ? ((await belegungHolen())[value] ?? 0) : 0; } catch { toast.error('Lead-Belegung konnte nicht geprüft werden. Bitte erneut versuchen.'); return; }
    const zusatz = betroffen > 0
      ? `\n\n${betroffen} ${betroffen === 1 ? 'Lead steht' : 'Leads stehen'} auf diesem Status. `
        + `${betroffen === 1 ? 'Er behält' : 'Sie behalten'} ihn, aber er taucht dann in keinem Filter mehr auf.`
      : '';
    if (confirm(`${label} „${value}" wirklich entfernen?${zusatz}`)) {
      setSettings((prev) => ({ ...prev, [key]: prev[key].filter((v) => v !== value) }));
    }
  };

  return (
    <div className={cn(SEITEN_RAND, 'space-y-4')}>
      <PageHeader
        title="Einstellungen"
        subtitle="Listen und Firmenangaben für dieses CRM."
        actions={
          canManage && <Button onClick={handleSave} disabled={speichert || !dirty}>
            {saved ? <Check className="size-4" /> : <Save className="size-4" />}
            {speichert ? 'Speichert…' : saved ? 'Gespeichert' : dirty ? 'Änderungen speichern' : 'Gespeichert'}
          </Button>
        }
      />

      <nav className="flex flex-wrap gap-2 border-b border-border-subtle" aria-label="Einstellungsbereiche">{([{id:'phone',label:'Telefonie'},{id:'mail',label:'E-Mail'},{id:'fields',label:'CRM-Felder'},{id:'company',label:'Unternehmen'}] as const).map(tab=><button key={tab.id} type="button" className="crm-view-tab" aria-pressed={section===tab.id} onClick={()=>setSection(tab.id)}>{tab.label}</button>)}</nav>
      {dirty && <p role="status" className="text-xs text-status-warning">Ungespeicherte Änderungen</p>}
      {section === 'phone' && <PhoneSettingsCard />}
      {section === 'mail' && <CrmMailSettings />}
      {section === 'fields' && <fieldset disabled={!canManage || speichert} className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        <ListEditor
          icon={<ListChecks className="size-4" />}
          title="Status"
          placeholder="Neuer Status…"
          items={settings.statuses}
          belegung={belegung}
          onAdd={(v) => addItem('statuses', v)}
          onRemove={(v) => void removeItem('statuses', v, 'Status')}
        />
        <ListEditor
          icon={<Briefcase className="size-4" />}
          title="Lead-Quellen"
          placeholder="Neue Quelle…"
          items={settings.sources}
          onAdd={(v) => addItem('sources', v)}
          onRemove={(v) => void removeItem('sources', v, 'Quelle')}
        />
        <ListEditor
          icon={<Package className="size-4" />}
          title="Branchen"
          placeholder="Neue Branche…"
          items={settings.industries}
          onAdd={(v) => addItem('industries', v)}
          onRemove={(v) => void removeItem('industries', v, 'Branche')}
        />
        <ListEditor
          icon={<Tag className="size-4" />}
          title="Etiketten"
          placeholder="Neues Etikett…"
          items={settings.tags}
          onAdd={(v) => addItem('tags', v)}
          onRemove={(v) => void removeItem('tags', v, 'Etikett')}
        />
      </fieldset>}

      {section === 'company' && <Card className={KARTE_INNEN}>
        <KartenTitel icon={<Briefcase className="size-4" />} title="Unternehmen" />
        <fieldset disabled={!canManage || speichert} className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Firmenname">
            <input
              type="text"
              value={settings.companyName}
              onChange={(e) => setSettings((prev) => ({ ...prev, companyName: e.target.value }))}
              className={cn(inputClass, 'h-9')}
            />
          </Field>
          <Field label="Standard-Währung">
            <input
              type="text"
              value={settings.currency}
              onChange={(e) => setSettings((prev) => ({ ...prev, currency: e.target.value }))}
              className={cn(inputClass, 'h-9')}
            />
          </Field>
        </fieldset>
      </Card>}
    </div>
  );
}

/**
 * Titelzeile einer Karte.
 *
 * Vorher: 40-px-Symbolfeld, Titel, Unterzeile, Trennlinie, 20 px Abstand —
 * zusammen rund 90 px, bevor der erste Eintrag kam. Die Unterzeilen sagten
 * dasselbe wie die Titel („Status-Optionen" / „Pipeline-Status verwalten").
 */
function KartenTitel({ icon, title, zusatz }: { icon: React.ReactNode; title: string; zusatz?: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent-500/15 text-accent-500">
        {icon}
      </span>
      <h3 className="text-sm font-medium text-text-primary">{title}</h3>
      {zusatz && <span className="ml-auto text-xs text-text-muted">{zusatz}</span>}
    </div>
  );
}

function ListEditor({
  icon,
  title,
  placeholder,
  items,
  belegung,
  onAdd,
  onRemove,
}: {
  icon: React.ReactNode;
  title: string;
  placeholder: string;
  items: string[];
  /**
   * Nur bei den Status gesetzt: wie viele Leads darauf stehen.
   * `null`, solange noch niemand auf ein Mülleimer-Symbol geklickt hat —
   * bis dahin wird die Leadliste absichtlich nicht geholt.
   */
  belegung?: Record<string, number> | null;
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
}) {
  const [draft, setDraft] = useState('');
  const commit = () => {
    onAdd(draft.trim());
    setDraft('');
  };

  return (
    <Card className={cn(KARTE_INNEN, 'flex flex-col')}>
      <KartenTitel icon={icon} title={title} zusatz={items.length > 0 ? `${items.length}` : undefined} />

      {items.length === 0 ? (
        <p className={cn(LEER_INNEN, 'flex-1 text-sm text-text-muted')}>Noch keine Einträge.</p>
      ) : (
        <ul className="mb-3 flex-1 space-y-1">
          {items.map((item) => (
            <li
              key={item}
              className="group flex items-center justify-between gap-2 rounded-md px-2 py-1 transition-colors hover:bg-elevated/60"
            >
              <span className="truncate text-sm text-text-primary">{item}</span>
              <span className="flex shrink-0 items-center gap-2">
                {belegung && belegung[item] > 0 && (
                  <span className="text-xs tabular-nums text-text-muted">{belegung[item]}</span>
                )}
                <IconButton
                  className="size-6 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                  tone="danger"
                  onClick={() => onRemove(item)}
                  aria-label={`„${item}" entfernen`}
                >
                  <Trash2 className="size-3.5" />
                </IconButton>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), commit())}
          placeholder={placeholder}
          aria-label={placeholder}
          className={cn(inputClass, 'h-8 text-sm')}
        />
        <Button onClick={commit} className="h-8 shrink-0 px-2.5" aria-label={`Zu ${title} hinzufügen`}>
          <Plus className="size-4" />
        </Button>
      </div>
    </Card>
  );
}
