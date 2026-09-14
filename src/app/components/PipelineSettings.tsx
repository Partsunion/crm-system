import { useState, useEffect, useRef } from 'react';
import { mayLeaveWorkspace, useWorkspaceGuard } from '../utils/useWorkspaceGuard';
import { Plus, Edit, Trash2, ChevronUp, ChevronDown, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { einstellungenSichern } from '../utils/einstellungenSichern';
import { stageCategory, type StageCategory } from '../utils/stages';
import { getSettings, getLeads, type PipelineStage } from '../utils/storage';
import {
  Card, PageHeader, Button, IconButton, Badge, Field, Modal, inputClass, cn, SEITEN_RAND,
} from './ui-kit';

/** Farb-Swatches als HEX (dark-tauglich) — der `color`-Wert bleibt im Datenmodell. */
/**
 * Farbfelder für die Stufen — Töne aus dem Redesign vom 2026-07-30.
 *
 * Die NAMEN bleiben unverändert (blue, cyan, …): sie stehen so in der Datenbank
 * an jeder angelegten Stufe. Nur die Hex-Werte sind neu, damit die Felder wie
 * der Entwurf aussehen. Wer die Namen ändert, macht bestehende Stufen farblos.
 */
const STAGE_COLORS: { name: string; label: string; hex: string }[] = [
  { name: 'blue', label: 'Blau', hex: '#5B8CFF' },
  { name: 'cyan', label: 'Cyan', hex: '#38BDF8' },
  { name: 'green', label: 'Grün', hex: '#3DDC97' },
  { name: 'yellow', label: 'Gelb', hex: '#F5B544' },
  { name: 'orange', label: 'Orange', hex: '#FB923C' },
  { name: 'red', label: 'Rot', hex: '#FF6B6B' },
  { name: 'purple', label: 'Lila', hex: '#A78BFA' },
  { name: 'pink', label: 'Pink', hex: '#F472B6' },
  { name: 'emerald', label: 'Smaragd', hex: '#22C55E' },
  { name: 'gray', label: 'Grau', hex: '#8A90A3' },
];

const colorHex = (name: string) => STAGE_COLORS.find((c) => c.name === name)?.hex ?? '#8A90A3';

export function PipelineSettings() {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<PipelineStage | null>(null);
  const [formData, setFormData] = useState({ name: '', color: 'blue', probability: 50, isActive: true, category: 'open' as StageCategory });
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const originalForm = editingStage
    ? {name:editingStage.name, color:editingStage.color, probability:editingStage.probability, isActive:editingStage.isActive, category:stageCategory(editingStage)}
    : {name:'', color:'blue', probability:50, isActive:true, category:'open'};
  useWorkspaceGuard(isModalOpen && JSON.stringify(formData) !== JSON.stringify(originalForm), busy);
  const closeEditor = () => { if (mayLeaveWorkspace()) setIsModalOpen(false); };

  useEffect(() => {
    loadStages();
  }, []);

  const loadStages = () => {
    setStages([...getSettings().pipelineStages].sort((a, b) => a.order - b.order));
  };

  const handleOpenModal = (stage?: PipelineStage) => {
    if (stage) {
      setEditingStage(stage);
      setFormData({ name: stage.name, color: stage.color, probability: stage.probability, isActive: stage.isActive, category: stageCategory(stage) });
    } else {
      setEditingStage(null);
      setFormData({ name: '', color: 'blue', probability: 50, isActive: true, category: 'open' });
    }
    setIsModalOpen(true);
  };

  const safeAction = async (action: () => Promise<void>) => {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true);
    try { await action(); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Aktion fehlgeschlagen. Bitte erneut versuchen.'); }
    finally { inFlight.current = false; setBusy(false); }
  };
  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Bitte geben Sie einen Namen ein.');
      return;
    }
    const settings = getSettings();
    if (settings.pipelineStages.some((stage) => stage.id !== editingStage?.id && stage.name.toLowerCase() === formData.name.trim().toLowerCase())) { toast.error('Eine Phase mit diesem Namen existiert bereits.'); return; }
    if (editingStage && !formData.isActive) {
      const assigned = (await getLeads()).filter((lead) => lead.status === editingStage.name);
      if (assigned.length) { toast.error(`${assigned.length} Leads verwenden diese Phase. Verschiebe sie zuerst, bevor du sie deaktivierst.`); return; }
    }
    let naechste: PipelineStage[];
    if (editingStage) {
      naechste = settings.pipelineStages.map((s) => (s.id === editingStage.id ? { ...s, ...formData } : s));
    } else {
      naechste = [...settings.pipelineStages, {
        id: crypto.randomUUID(),
        name: formData.name,
        category: formData.category,
        color: formData.color,
        probability: formData.probability,
        order: settings.pipelineStages.length + 1,
        isActive: formData.isActive,
      }];
    }
    // Erst speichern, dann melden — vorher stand die Erfolgsmeldung fest,
    // egal was der Server antwortete.
    const saved = await einstellungenSichern(
      { ...settings, pipelineStages: naechste },
      editingStage ? 'Stage aktualisiert.' : `Stage „${formData.name}" angelegt.`,
    );
    if (saved) { loadStages(); setIsModalOpen(false); }
  };

  const handleDelete = async (stageId: string) => {
    const stage = stages.find((item) => item.id === stageId);
    if ((await getLeads()).some((lead) => lead.status === stage?.name)) { toast.error('Diese Phase enthält Leads. Verschiebe sie vor dem Löschen.'); return; }
    if (confirm('Möchten Sie diese Pipeline-Stage wirklich löschen?')) {
      const settings = getSettings();
      await einstellungenSichern(
        { ...settings, pipelineStages: settings.pipelineStages.filter((s) => s.id !== stageId) },
        'Stage gelöscht.',
      ).then(loadStages);
    }
  };

  const handleToggleActive = async (stageId: string) => {
    const settings = getSettings();
    const stage = settings.pipelineStages.find((item) => item.id === stageId);
    if (stage?.isActive && (await getLeads()).some((lead) => lead.status === stage.name)) { toast.error('Diese Phase enthält Leads und kann nicht deaktiviert werden.'); return; }
    const updated = settings.pipelineStages.map((s) => (s.id === stageId ? { ...s, isActive: !s.isActive } : s));
    await einstellungenSichern({ ...settings, pipelineStages: updated },
      'Stage umgeschaltet.').then(loadStages);
  };

  const moveStage = async (index: number, direction: 'up' | 'down') => {
    const next = [...stages];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    const updated = next.map((stage, idx) => ({ ...stage, order: idx + 1 }));
    const settings = getSettings();
    await einstellungenSichern({ ...settings, pipelineStages: updated },
      'Reihenfolge geändert.').then(loadStages);
  };

  return (
    <div className={cn(SEITEN_RAND, 'space-y-5')}>
      <PageHeader
        title="Pipeline-Setup"
        subtitle="Verwalten Sie Ihre Pipeline-Phasen und deren Reihenfolge."
        actions={
          <Button disabled={busy} onClick={() => handleOpenModal()}>
            <Plus className="size-4" />
            Neue Phase
          </Button>
        }
      />

      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-text-secondary">
        <span><strong className="text-text-primary">{stages.length}</strong> Phasen</span>
        <span>{stages.filter((s) => s.isActive).length} aktiv</span>
        <span>{stages.filter((s) => !s.isActive).length} inaktiv</span>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-border-subtle px-4 py-3">
          <h3 className="font-medium text-text-primary">Pipeline-Phasen</h3>
          <p className="mt-0.5 text-sm text-text-muted">
            Mit den Pfeilen ändern Sie die Reihenfolge der Phasen.
          </p>
        </div>
        <div className="divide-y divide-border-subtle">
          {stages.map((stage, index) => (
            <div
              key={stage.id}
              className={cn(
                'flex items-center gap-4 px-4 py-3 transition-colors hover:bg-elevated',
                !stage.isActive && 'opacity-60',
              )}
            >
              <div className="flex flex-col">
                <button
                  onClick={() => void safeAction(() => moveStage(index, 'up'))}
                  disabled={busy || index === 0}
                  className="rounded p-0.5 text-text-muted transition-colors hover:bg-elevated-hover hover:text-text-primary disabled:opacity-30"
                  aria-label="Nach oben"
                >
                  <ChevronUp className="size-4" />
                </button>
                <button
                  onClick={() => void safeAction(() => moveStage(index, 'down'))}
                  disabled={busy || index === stages.length - 1}
                  className="rounded p-0.5 text-text-muted transition-colors hover:bg-elevated-hover hover:text-text-primary disabled:opacity-30"
                  aria-label="Nach unten"
                >
                  <ChevronDown className="size-4" />
                </button>
              </div>

              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-elevated font-mono text-sm font-semibold text-text-secondary">
                {stage.order}
              </div>

              <span
                className="h-8 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: colorHex(stage.color) }}
                aria-hidden
              />

              <div className="min-w-0 flex-1">
                <div className="font-medium text-text-primary">{stage.name}</div>
                <div className="text-sm text-text-muted">{({ open: 'Offen', won: 'Gewonnen', lost: 'Verloren' })[stageCategory(stage)]} · {stage.probability}% Planannahme</div>
              </div>

              <Badge tone={stage.isActive ? 'success' : 'neutral'} dot>
                {stage.isActive ? 'Aktiv' : 'Inaktiv'}
              </Badge>

              <div className="flex items-center gap-1">
                <IconButton
                  className="size-8"
                  disabled={busy}
                  onClick={() => void safeAction(() => handleToggleActive(stage.id))}
                  title={stage.isActive ? 'Deaktivieren' : 'Aktivieren'}
                >
                  {stage.isActive ? <X className="size-4" /> : <Check className="size-4" />}
                </IconButton>
                <IconButton disabled={busy} className="size-8" onClick={() => handleOpenModal(stage)} aria-label="Bearbeiten">
                  <Edit className="size-4" />
                </IconButton>
                <IconButton disabled={busy} className="size-8" tone="danger" onClick={() => void safeAction(() => handleDelete(stage.id))} aria-label="Löschen">
                  <Trash2 className="size-4" />
                </IconButton>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {isModalOpen && (
        <Modal
          onClose={closeEditor}
          title={editingStage ? 'Phase bearbeiten' : 'Neue Phase erstellen'}
          subtitle="Definieren Sie eine Phase in Ihrer Verkaufs-Pipeline."
          footer={
            <>
              <Button variant="secondary" disabled={busy} onClick={closeEditor}>
                Abbrechen
              </Button>
              <Button disabled={busy} onClick={() => void safeAction(handleSave)}>{busy ? 'Speichert…' : editingStage ? 'Speichern' : 'Phase erstellen'}</Button>
            </>
          }
        >
          <fieldset disabled={busy} className="space-y-5">
            <Field label="Fachlicher Phasentyp" hint="Bleibt auch bei einer Umbenennung erhalten. Eine bereits verwendete Phase kann nicht umklassifiziert werden."><select className={inputClass} value={formData.category} onChange={(event) => setFormData({ ...formData, category: event.target.value as StageCategory })}><option value="open">Offen</option><option value="won">Gewonnen</option><option value="lost">Verloren</option></select></Field>
            <Field label="Name der Phase" required>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="z.B. Erstkontakt, Demo geplant …"
                className={cn(inputClass, 'h-9')}
              />
            </Field>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-secondary">Farbe</label>
              <div className="flex flex-wrap gap-2.5">
                {STAGE_COLORS.map((color) => {
                  const selected = formData.color === color.name;
                  return (
                    <button
                      key={color.name}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: color.name })}
                      title={color.label}
                      className={cn(
                        'size-9 rounded-md ring-2 ring-offset-2 ring-offset-surface transition-all hover:scale-105',
                        selected ? 'ring-accent-500' : 'ring-transparent',
                      )}
                      style={{ backgroundColor: color.hex }}
                    />
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-secondary">
                Abschlusswahrscheinlichkeit: <span className="font-semibold text-text-primary">{formData.probability}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                step={10}
                value={formData.probability}
                onChange={(e) => setFormData({ ...formData, probability: parseInt(e.target.value) })}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-elevated accent-[var(--accent-500)]"
              />
              <div className="flex justify-between text-xs text-text-muted">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border-subtle bg-elevated/40 p-3">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="size-4 accent-[var(--accent-500)]"
              />
              <span className="text-sm font-medium text-text-primary">Phase ist aktiv</span>
            </label>
          </fieldset>
        </Modal>
      )}
    </div>
  );
}
