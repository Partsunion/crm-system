/**
 * CommandPalette (⌘K) — schnelle Navigation + Aktionen, wie im Admin-Dashboard.
 * Lean auf cmdk, dark-getokent.
 */
import { Command } from 'cmdk';
import { useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  LayoutDashboard, Users, Workflow, BarChart3, Settings as SettingsIcon,
  UserCog, Layers, Plus, Upload, Search, Radar, Calendar,
} from 'lucide-react';
import type { ViewId } from './layout/Sidebar';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (view: ViewId) => void;
  onNewLead: () => void;
  onImport: () => void;
}

const NAV: { view: ViewId; label: string; icon: typeof LayoutDashboard; kw?: string }[] = [
  { view: 'dashboard', label: 'Arbeitsübersicht', icon: LayoutDashboard, kw: 'übersicht home start' },
  { view: 'leads', label: 'Leads', icon: Users, kw: 'kontakte firmen' },
  { view: 'pipeline', label: 'Pipeline', icon: Workflow, kw: 'kanban stages board' },
  { view: 'scraper', label: 'Lead-Quellen', icon: Radar, kw: 'scraper osm umkreis autoteilehändler leads finden' },
  { view: 'reports', label: 'Berichte', icon: BarChart3, kw: 'analytics statistik funnel' },
  /* Der Kalender FEHLTE hier, obwohl er in der Seitenleiste steht und
     eine eigene Ansicht ist. Wer ihn über das Suchfeld erreichen wollte,
     fand nichts — und schloss daraus vermutlich, dass es ihn nicht gibt.
     Eine Suche, die eine vorhandene Seite verschweigt, ist schlimmer als
     keine: sie beantwortet die Frage falsch statt gar nicht. */
  { view: 'kalender', label: 'Kalender', icon: Calendar, kw: 'termine kalender follow-up wiedervorlage' },
  { view: 'security', label: 'Kontosicherheit', icon: UserCog, kw: 'passwort mfa authenticator sicherheit' },
  { view: 'settings', label: 'Einstellungen', icon: SettingsIcon },
  { view: 'users', label: 'Vertriebsteam', icon: UserCog, kw: 'team' },
  { view: 'pipelineSettings', label: 'Pipeline-Setup', icon: Layers, kw: 'stages' },
];

export function CommandPalette({ open, onClose, onNavigate, onNewLead, onImport }: CommandPaletteProps) {
  const returnFocus = useRef<HTMLElement | null>(null);
  const go = (fn: () => void) => {
    fn();
    onClose();
  };

  return (
    <Dialog.Root open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/60 animate-in fade-in duration-150" />
        <Dialog.Content
          aria-describedby={undefined}
          onOpenAutoFocus={() => { returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; }}
          onCloseAutoFocus={(event) => { event.preventDefault(); if (returnFocus.current?.isConnected) returnFocus.current.focus(); }}
          className="fixed left-1/2 top-[12vh] z-[61] w-[calc(100%_-_2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-modal animate-in fade-in duration-150">
            <Dialog.Title className="sr-only">Schnellsuche und Aktionen</Dialog.Title>
            <Command
              label="Befehle"
              className="[&_[cmdk-group-heading]]:label-technical [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-text-muted"
            >
              <div className="flex items-center gap-2 border-b border-border-subtle px-3">
                <Search className="size-4 shrink-0 text-text-muted" />
                <Command.Input
                  placeholder="Suchen oder Befehl eingeben…"
                  className="h-12 w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
                />
                <kbd className="rounded border border-border-subtle px-1.5 py-0.5 font-mono text-[10px] text-text-muted">ESC</kbd>
              </div>
              <Command.List className="max-h-[55vh] overflow-y-auto p-2">
                <Command.Empty className="px-3 py-8 text-center text-sm text-text-muted">
                  Keine Treffer.
                </Command.Empty>

                <Command.Group heading="Navigation">
                  {NAV.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Command.Item
                        key={item.view}
                        value={`${item.label} ${item.kw ?? ''}`}
                        onSelect={() => go(() => onNavigate(item.view))}
                        className="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-text-secondary data-[selected=true]:bg-elevated data-[selected=true]:text-text-primary"
                      >
                        <Icon className="size-4 text-text-muted" />
                        {item.label}
                      </Command.Item>
                    );
                  })}
                </Command.Group>

                <Command.Group heading="Aktionen">
                  <Command.Item
                    value="Neuer Lead anlegen erstellen"
                    onSelect={() => go(onNewLead)}
                    className="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-text-secondary data-[selected=true]:bg-elevated data-[selected=true]:text-text-primary"
                  >
                    <Plus className="size-4 text-accent-500" />
                    Neuer Lead
                  </Command.Item>
                  <Command.Item
                    value="Leads importieren csv"
                    onSelect={() => go(onImport)}
                    className="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-text-secondary data-[selected=true]:bg-elevated data-[selected=true]:text-text-primary"
                  >
                    <Upload className="size-4 text-text-muted" />
                    Leads importieren
                  </Command.Item>
                </Command.Group>
              </Command.List>
            </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
