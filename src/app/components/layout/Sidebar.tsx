/**
 * Sidebar — Partsunion CRM. Im exakten Schema des Admin-Dashboards:
 *  - 240px ausgeklappt / 56px eingeklappt, localStorage-Persistenz
 *  - 2px Sharp Accent-Bar bei aktivem Item (kein voller Highlight-BG)
 *  - Sektionen, Tooltips bei collapsed, ⌘\-Toggle, Footer-Einklappen
 *  - Mobile: Slide-Over-Drawer mit Backdrop
 *
 * Das CRM nutzt State-Navigation (kein react-router) → Items tragen eine
 * `view`-Id statt einer Route.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Workflow,
  Radar,
  BarChart3,
  Calendar,
  Settings as SettingsIcon,
  UserCog,
  Layers,
  PanelLeftClose,
  PanelLeftOpen,
  Pin,
  PinOff,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../ui/utils';
import { ansichtVorwaermen } from '../../vorwaermen';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '../ui/sheet';
import { WORKSPACE_BRAND, WORKSPACE_MARK, WORKSPACE_NAV_ITEM, WORKSPACE_NAV_ACTIVE } from './workspaceShell';

export type ViewId =
  | 'dashboard'
  | 'leads'
  | 'pipeline'
  | 'scraper'
  | 'reports'
  | 'kalender'
  | 'settings'
  | 'security'
  | 'users'
  | 'pipelineSettings';

interface NavItem {
  view: ViewId;
  label: string;
  icon: LucideIcon;
  tone: NavTone;
}

type NavTone = 'accent' | 'info' | 'success' | 'warning' | 'danger';

const NAV_TONES: Record<NavTone, string> = {
  accent: 'bg-overlay/[0.045] text-blue-300',
  info: 'bg-overlay/[0.045] text-sky-300',
  success: 'bg-overlay/[0.045] text-emerald-300',
  warning: 'bg-overlay/[0.045] text-amber-300',
  danger: 'bg-overlay/[0.045] text-rose-300',
};

interface NavSection {
  id: string;
  label: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'crm',
    label: 'CRM',
    items: [
      { view: 'dashboard', label: 'Arbeitsübersicht', icon: LayoutDashboard, tone: 'accent' },
      { view: 'leads', label: 'Leads', icon: Users, tone: 'info' },
      { view: 'kalender', label: 'Kalender', icon: Calendar, tone: 'warning' },
      { view: 'pipeline', label: 'Pipeline', icon: Workflow, tone: 'success' },
      { view: 'scraper', label: 'Lead-Quellen', icon: Radar, tone: 'warning' },
      { view: 'reports', label: 'Berichte', icon: BarChart3, tone: 'accent' },
    ],
  },
  {
    id: 'admin',
    label: 'Organisation',
    items: [
      { view: 'settings', label: 'Einstellungen', icon: SettingsIcon, tone: 'accent' },
      { view: 'security', label: 'Kontosicherheit', icon: UserCog, tone: 'danger' },
      { view: 'users', label: 'Vertriebsteam', icon: UserCog, tone: 'info' },
      { view: 'pipelineSettings', label: 'Pipeline-Setup', icon: Layers, tone: 'success' },
    ],
  },
];

/** Label einer View (für den Topbar-Titel). */
export const VIEW_LABELS: Record<ViewId, string> = Object.fromEntries(
  NAV_SECTIONS.flatMap((s) => s.items.map((i) => [i.view, i.label])),
) as Record<ViewId, string>;

const STORAGE_KEY = 'pu.crm.sidebar.collapsed.v1';
const PIN_KEY = 'pu.crm.sidebar.pinned.v1';

/**
 * Lesen und Schreiben gekapselt: In Safaris privatem Modus und in verwalteten
 * Firmenbrowsern wirft schon der Zugriff auf localStorage einen SecurityError.
 * Ohne Kapselung risse das die ganze Seitenleiste mit — fuer eine Einstellung,
 * die niemand braucht, um zu arbeiten.
 */
function lies(schluessel: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(schluessel) === '1';
  } catch {
    return false;
  }
}

function schreib(schluessel: string, wert: boolean): void {
  try {
    window.localStorage.setItem(schluessel, wert ? '1' : '0');
  } catch {
    /* Ohne Speicher gilt die Einstellung nur fuer diese Sitzung. */
  }
}

interface SidebarProps {
  activeView: ViewId;
  onNavigate: (view: ViewId) => void;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}

export function Sidebar({ activeView, onNavigate, mobileOpen, onMobileOpenChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState<boolean>(() => lies(STORAGE_KEY));
  /**
   * Angeheftet = die Seitenleiste bleibt offen stehen.
   *
   * Ohne das klappte sie nach JEDEM Klick wieder ein — auch wenn man sie
   * gerade aufgeklappt hatte. Wer sich beim Arbeiten an der Navigation
   * orientiert, musste sie dutzendfach am Tag neu aufziehen.
   *
   * Angeheftet gewinnt immer: keine automatische Einklappung nach der
   * Navigation, kein Hover-Overlay (es waere ja schon offen).
   */
  const [angeheftet, setAngeheftet] = useState<boolean>(() => lies(PIN_KEY));
  // Hover-Ausklappen: bei eingeklappter Sidebar legt sich beim Drüberfahren ein
  // ausgeklapptes Overlay ÜBER den Inhalt (kein Layout-Shift der Tabelle).
  const [hovering, setHovering] = useState(false);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      schreib(STORAGE_KEY, next);
      // Einklappen und angeheftet sein widerspricht sich. Wer einklappt, will
      // die Leiste weghaben — also loest sich die Anheftung mit.
      if (next) {
        setAngeheftet(false);
        schreib(PIN_KEY, false);
      }
      return next;
    });
  }, []);

  /** Anheften bedeutet immer auch: aufgeklappt. */
  const toggleAngeheftet = useCallback(() => {
    setAngeheftet((prev) => {
      const next = !prev;
      schreib(PIN_KEY, next);
      if (next) {
        setCollapsed(false);
        schreib(STORAGE_KEY, false);
        setHovering(false);
      }
      return next;
    });
  }, []);

  // Nach jeder Navigation automatisch einklappen — die Arbeitsflächen (Leads,
  // Pipeline …) bekommen die volle Breite; ausklappen jederzeit per Hover.
  // ES SEI DENN, die Leiste ist angeheftet: dann bleibt sie, wo sie ist.
  const handleNavigate = useCallback(
    (view: ViewId) => {
      onNavigate(view);
      setHovering(false);
    },
    [onNavigate],
  );

  // ⌘\ / Ctrl+\ Toggle
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        toggleCollapsed();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleCollapsed]);

  return (
    <>
      {/* Desktop — bei collapsed legt Hover ein ausgeklapptes Overlay über den Inhalt */}
      <div
        className="relative hidden shrink-0 md:block"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <aside
          className={cn(
            'crm-sidebar sticky top-0 flex h-screen flex-col border-r',
            // Redesign: durchscheinende Verlaufsfläche statt deckendem Grau.
            // Die Leiste sitzt damit auf dem Lichtverlauf der Seite, statt ihn
            // zu verdecken.
            'transition-[width] duration-200 ease-out',
            collapsed ? 'w-16' : 'w-64',
          )}
          aria-label="Hauptnavigation"
        >
          <Brand collapsed={collapsed} />
          <Nav activeView={activeView} onNavigate={handleNavigate} collapsed={collapsed} />
          <Footer
            collapsed={collapsed}
            onToggle={toggleCollapsed}
            angeheftet={angeheftet}
            onToggleAngeheftet={toggleAngeheftet}
          />
        </aside>
        {collapsed && hovering && (
          <aside
            className="crm-sidebar absolute inset-y-0 left-0 z-40 flex w-64 flex-col border-r shadow-2xl"
            aria-label="Hauptnavigation (ausgeklappt)"
          >
            <Brand collapsed={false} />
            <Nav activeView={activeView} onNavigate={handleNavigate} collapsed={false} />
            {/* Der Anheft-Knopf sitzt bewusst AUCH hier: so kann man die Leiste
                aufziehen und im selben Zug festmachen, ohne sie erst ueber den
                Fussknopf dauerhaft aufklappen zu muessen. */}
            <Footer
              collapsed={false}
              onToggle={toggleCollapsed}
              angeheftet={angeheftet}
              onToggleAngeheftet={toggleAngeheftet}
            />
          </aside>
        )}
      </div>

      {/* Mobile Drawer */}
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="left" className="crm-sidebar w-64 gap-0 border-r p-0" onCloseAutoFocus={event => { event.preventDefault(); document.querySelector<HTMLButtonElement>('[aria-label="Navigation öffnen"]')?.focus(); }}>
          <SheetTitle className="sr-only">CRM-Navigation</SheetTitle>
          <SheetDescription className="sr-only">Arbeitsbereich auswählen</SheetDescription>
            <Brand collapsed={false} />
            <Nav
              activeView={activeView}
              onNavigate={(v) => {
                onNavigate(v);
                onMobileOpenChange(false);
              }}
              collapsed={false}
            />
        </SheetContent>
      </Sheet>
    </>
  );
}

/**
 * Markenblock nach dem Redesign: Verlaufsquadrat mit UNSEREM Symbol, daneben
 * Name und "SALES CRM" in Versalien.
 *
 * Im Quadrat steht das echte Logo, nicht das gezeichnete "P" des Entwurfs. Die
 * Geometrie ist die des Entwurfs (32 px, 9 px Radius, Akzentverlauf).
 *
 * Warum die weisse Ausstanzung und nicht das farbige Logo: das Markenblau
 * (#2260cd) auf dem Akzentverlauf ergibt keinen Kontrast — Blau auf Blau. Die
 * Datei ist aus der Wortmarke freigestellt, nicht nachgezeichnet.
 *
 * Vorher hing hier ein Ausschnitt der Wortmarke mit `object-cover object-left`.
 * Das Symbol als eigene Datei skaliert in jeder Groesse und braucht keinen
 * Zuschnitt, der bei anderem Bild sofort falsch waere.
 */
function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <div
      className={cn(
        WORKSPACE_BRAND,
        collapsed && 'justify-center px-0',
      )}
    >
      <span className={WORKSPACE_MARK}>
        <img
          src="/partsunion-symbol-weiss.png"
          alt="Partsunion"
          width={19}
          height={19}
          className="size-[19px]"
        />
      </span>
      {!collapsed && (
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate font-display text-sm font-bold tracking-[0.02em] text-text-primary">
            Partsunion
          </span>
          <span className="text-xs font-medium text-text-muted">
            CRM · Vertrieb
          </span>
        </span>
      )}
    </div>
  );
}

function Nav({
  activeView,
  onNavigate,
  collapsed,
}: {
  activeView: ViewId;
  onNavigate: (view: ViewId) => void;
  collapsed: boolean;
}) {
  return (
    <nav className="flex-1 overflow-y-auto px-0 pb-3 pt-3" aria-label="Navigation">
      {NAV_SECTIONS.map((section) => (
        <div key={section.id} className="mb-3">
          {!collapsed && (
            <div className="mb-1 px-[22px] text-[9px] font-bold uppercase tracking-[0.16em] text-text-muted">
              {section.label}
            </div>
          )}
          {collapsed && <div className="mx-3 mb-2 border-t border-border-subtle" />}
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.view;
              return (
                <li key={item.view}>
                  <button
                    type="button"
                    onClick={() => onNavigate(item.view)}
                    // Beim Ueberfahren schon holen. Betrifft nur die
                    // Berichte — sie bringen 430 KB Diagrammbibliothek mit
                    // und sind deshalb als einzige nicht vorgewaermt (siehe
                    // App.tsx). Zwischen Ueberfahren und Klicken liegen ein
                    // paar hundert Millisekunden; die reichen fuer den
                    // groessten Teil des Downloads.
                    onMouseEnter={() => ansichtVorwaermen(item.view)}
                    onFocus={() => ansichtVorwaermen(item.view)}
                    title={collapsed ? item.label : undefined}
                    aria-label={collapsed ? item.label : undefined}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      // Redesign: 10 px Radius, Manrope halbfett, durchscheinende
                      // Auflage beim Ueberfahren statt deckender Flaeche.
                      WORKSPACE_NAV_ITEM, 'w-[calc(100%-1.5rem)]',
                      collapsed ? 'justify-center px-0' : 'gap-[11px] px-[11px]',
                      isActive
                        // Waagerechter Akzentverlauf, der nach rechts auslaeuft
                        // text-text-primary, NICHT text-white: der Verlauf ist
                        // durchscheinend, und im Hellmodus wäre weisse Schrift
                        // darauf unsichtbar. Im Admin am Bild nachgemessen.
                        ? WORKSPACE_NAV_ACTIVE
                        : 'text-text-tertiary hover:bg-overlay/[0.055] hover:text-text-primary',
                    )}
                  >
                    {isActive && (
                      <span
                        aria-hidden
                        className="absolute inset-y-0 left-0 w-[2px] rounded-r-full bg-accent-500"
                      />
                    )}
                    <span
                      className={cn(
                        'flex size-7 shrink-0 items-center justify-center rounded-md transition-[background-color,color] duration-150',
                        isActive ? 'bg-overlay/[0.10] text-text-primary' : NAV_TONES[item.tone],
                      )}
                    >
                      <Icon size={15} aria-hidden />
                    </span>
                    {!collapsed && <span className="flex-1 truncate text-left">{item.label}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Footer({
  collapsed,
  onToggle,
  angeheftet,
  onToggleAngeheftet,
}: {
  collapsed: boolean;
  onToggle: () => void;
  angeheftet: boolean;
  onToggleAngeheftet: () => void;
}) {
  return (
    <div className="shrink-0 border-t border-border-subtle p-3.5">
      {/* Anheften — nur sichtbar, wenn die Leiste offen ist. Eingeklappt waere
          der Knopf sinnlos: anheften heisst ja gerade "offen lassen". */}
      {!collapsed && (
        <button
          type="button"
          onClick={onToggleAngeheftet}
          aria-pressed={angeheftet}
          title={
            angeheftet
              ? 'Angeheftet — die Seitenleiste bleibt offen'
              : 'Seitenleiste anheften, damit sie beim Navigieren offen bleibt'
          }
          className={cn(
            'mb-1 flex w-full items-center justify-start gap-2 rounded-lg px-1 py-1.5 text-xs font-semibold transition-colors',
            angeheftet
              ? 'text-accent-500'
              : 'text-text-muted hover:text-text-primary',
          )}
        >
          {angeheftet ? <Pin size={16} className="shrink-0" /> : <PinOff size={16} className="shrink-0" />}
          <span className="truncate">{angeheftet ? 'Angeheftet' : 'Anheften'}</span>
        </button>
      )}

      <button
        type="button"
        onClick={onToggle}
        title={collapsed ? 'Sidebar ausklappen (⌘\\)' : undefined}
        className={cn(
          'flex w-full items-center rounded-lg py-1.5 text-xs font-semibold text-text-muted transition-colors hover:text-text-primary',
          collapsed ? 'justify-center px-0' : 'justify-start gap-2 px-1',
        )}
        aria-label={collapsed ? 'Sidebar ausklappen' : 'Sidebar einklappen'}
      >
        {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        {!collapsed && <span>Einklappen</span>}
        {!collapsed && (
          <kbd className="ml-auto rounded-[5px] bg-overlay/[0.05] px-1.5 py-[3px] font-mono text-[10px] font-medium text-text-muted">
            ⌘\
          </kbd>
        )}
      </button>
    </div>
  );
}
