/**
 * ui-kit — Partsunion CRM Design-Primitive ("Industrial Precision", dark-only).
 *
 * Eine kleine, konsistente Bausteinsammlung im exakten Schema des
 * Admin-Dashboards: dezente surface-Karten mit border-subtle, 8px-Radius,
 * Mono-Uppercase-Labels, Akzent-Buttons (Deep Signal Blue), tokenbasierte
 * Status-Pills. ALLE Views konsumieren diese Primitive — keine Inline-
 * Light-Theme-Farben mehr.
 */

import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  useId,
  Children,
  isValidElement,
  cloneElement,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
  type ReactElement,
} from 'react';
import { X, Check, ChevronDown, ArrowLeft } from 'lucide-react';
import { cn } from './ui/utils';
import { KACHEL, KACHEL_ZAHL, SEITEN_TITEL } from './dichte';

/* ──────────────────────────────────────────────────────────────
 * Tone-System — semantische Status-Töne → Utility-Klassen
 * ────────────────────────────────────────────────────────────── */

export type Tone =
  | 'neutral'
  | 'accent'
  | 'success'
  | 'warning'
  | 'used'
  | 'danger'
  | 'info';

/**
 * ─── Warum die farbigen Töne vollflächig sind ──────────────────────────────
 *
 * Hier stand `bg-status-success/15 text-status-success` — eine 15-%-Tönung der
 * eigenen Farbe mit derselben Farbe als Schrift. In den Leads standen davon
 * mehrere nebeneinander, und die Reihe wirkte blass gegenüber den damals
 * vollflächigen Statuspillen derselben Anwendung.
 *
 * NACHTRAG 2026-08-07: Die Statuspillen sind inzwischen selbst getönt (siehe
 * StatusBadge weiter unten). Das hier ist trotzdem kein Widerspruch — dort
 * ist die Schrift eine AUFGEHELLTE Fassung der Grundfarbe, nicht dieselbe.
 * Genau daran scheiterte der Versuch, der hier beschrieben ist.
 *
 * Nachgerechnet kam ein zweiter Grund dazu: im HELLMODUS lag die Schrift bei
 * 4,1 statt 4,5 — unlesbar nach der Richtlinie. Eine Tönung derselben Farbe
 * zieht den Untergrund in Richtung der Schrift, es gibt dort keinen Wert, der
 * trägt. Auch 8 % nicht.
 *
 * `neutral` bleibt bewusst zurückhaltend: das ist kein Status, sondern die
 * Abwesenheit eines Status. Eine graue Vollfläche würde Bedeutung behaupten,
 * wo keine ist.
 *
 * Wertgleich mit Admin-Dashboard/src/utils/onboardingStufen.ts.
 */
const TONE_BADGE: Record<Tone, string> = {
  neutral: 'bg-elevated text-text-secondary ring-1 ring-inset ring-border-subtle',
  accent: 'bg-accent-500 text-auf-ton',
  success: 'bg-status-success text-auf-ton',
  warning: 'bg-status-warning text-auf-ton',
  used: 'bg-dealer-used text-dealer-used-foreground',
  danger: 'bg-status-danger text-auf-ton',
  info: 'bg-status-info text-auf-ton',
};

const TONE_DOT: Record<Tone, string> = {
  neutral: 'bg-text-muted',
  accent: 'bg-accent-500',
  success: 'bg-status-success',
  warning: 'bg-status-warning',
  used: 'bg-dealer-used',
  danger: 'bg-status-danger',
  info: 'bg-status-info',
};

/*
 * ENTFERNT: toneForStatus(status) → Tone.
 *
 * Niemand hat die Funktion aufgerufen — nachgezaehlt am 2026-08-07, kein
 * einziger Verweis im ganzen Quellbaum. Gezeichnet werden Status ueber
 * statusTon(), nicht ueber die Toene dieser Datei.
 *
 * Stehen lassen waere schlimmer als loeschen, denn sie behauptete eine
 * Zuordnung, die nicht stimmt: „Neu" und „Kontaktiert" bekamen denselben Ton,
 * „Angebot" und „Verhandlung" auch, und „Broschüre" und „Warm Halten" fielen
 * durch auf `neutral` — also auf die Darstellung fuer „gar kein Status",
 * obwohl beides echte Stufen der Pipeline sind. Wer sie kuenftig benutzt
 * haette, haette sich diese Fehler eingehandelt, ohne dass irgendwo etwas
 * kaputtgegangen waere.
 */

/** Priorität → Ton. */
export function toneForPriority(priority?: string): Tone {
  switch (priority) {
    case 'Hoch':
      return 'danger';
    case 'Mittel':
      return 'warning';
    case 'Niedrig':
      return 'success';
    default:
      return 'neutral';
  }
}

/** Design-/Lead-Score → Ton + Label (niedriger Score = besser). */
export function scoreTone(score?: number): { tone: Tone; label: string } {
  if (!score || score <= 0) return { tone: 'neutral', label: 'N/A' };
  if (score >= 70) return { tone: 'danger', label: 'Schlecht' };
  if (score >= 50) return { tone: 'warning', label: 'Mäßig' };
  if (score >= 30) return { tone: 'warning', label: 'OK' };
  return { tone: 'success', label: 'Gut' };
}

/* ──────────────────────────────────────────────────────────────
 * Badge / StatusBadge
 * ────────────────────────────────────────────────────────────── */

export function Badge({
  tone = 'neutral',
  dot = false,
  className,
  children,
}: {
  tone?: Tone;
  dot?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        TONE_BADGE[tone],
        className,
      )}
    >
      {dot && <span className={cn('size-1.5 rounded-full', TONE_DOT[tone])} />}
      {children}
    </span>
  );
}

/* ── Monday-Style solid color labels ────────────────────────────
 * Vollflächige farbige Status-/Prioritäts-Pills (Mondays Markenzeichen).
 * Feste Zuordnung für bekannte Werte, deterministischer Hash-Fallback für
 * benutzerdefinierte (in Einstellungen anlegbare) Status. */

/**
 * Statusfarben — neun Stufen, neun unterscheidbare Farben.
 *
 * ─── Was hier vorher nicht stimmte ─────────────────────────────────────────
 *
 * Der vorige Satz stammte aus dem Entwurf vom 2026-07-30 und hatte drei
 * Fehler, die man erst beim Nachrechnen sieht:
 *
 *  • „Broschüre" und „Angebot" trugen BEIDE #F5B544 — dieselbe Farbe, ΔE 0.
 *    In der Leadliste standen sie nebeneinander und waren nicht zu trennen.
 *  • „Warm Halten" war grün (#3DDC97) und damit kaum von „Gewonnen" (#22C55E)
 *    zu unterscheiden. Ein geparkter Lead sah aus wie ein gewonnener.
 *  • Bei Grünschwäche — rund acht Prozent aller Männer — fielen sieben Paare
 *    zusammen, darunter „Verhandlung" und „Verloren" mit ΔE 1,3. Das ist
 *    dieselbe Farbe.
 *
 * ─── Wie die neuen Werte zustande kamen ────────────────────────────────────
 *
 * Nicht ausgesucht, sondern gesucht. Aus mehreren Kandidaten je Stufe wurde
 * die Kombination genommen, die drei Bedingungen zugleich erfüllt:
 *
 *   1. Kontrast zur gewählten Schriftfarbe mindestens 4,5 (Richtlinie).
 *      Schwächster Wert: 5,03 bei „Qualifiziert".
 *   2. Jedes der 36 Paare mindestens ΔE 14 auseinander. Schwächstes Paar:
 *      „Angebot"/„Verloren" mit 16,1.
 *   3. Bedingung 2 gilt AUCH in der Simulation der Grünschwäche.
 *
 * Bedingung 3 ist der Grund, warum „Verhandlung" pink ist und nicht orange.
 * Orange und Rot fallen bei Grünschwäche zusammen — und ausgerechnet
 * „in Verhandlung" und „verloren" zu verwechseln, ist der teuerste Irrtum,
 * den diese Liste anbieten kann. Pink liegt auf der Blau-Rot-Achse und bleibt
 * getrennt.
 *
 * Die Anordnung folgt dem Trichter: kühl am Anfang (Neu, Kontaktiert), die
 * Marke bei „Qualifiziert", warm gegen Ende, und „Warm Halten" bewusst
 * gedeckt — das ist kein Fortschritt, sondern ein Parkplatz.
 *
 * ─── Nachrechnen ──────────────────────────────────────────────────────────
 *
 * statusFarben.test.ts prüft alle Bedingungen bei jedem Testlauf, für BEIDE
 * Modi. Wer eine Farbe ändert, bekommt gesagt, welche Bedingung er bricht.
 */
/**
 * Zuordnung Stufenname → Stamm des Variablennamens.
 *
 * Die eigentlichen Farben stehen in styles/theme.css, nicht hier — nur dort
 * koennen sie mit dem Hell-/Dunkelmodus kippen. Frueher lagen an dieser
 * Stelle feste HEX-Werte fuer beide Modi; damit war der Hellmodus entweder
 * unlesbar oder er sah aus wie der Dunkelmodus mit Schleier.
 *
 * „Broschüre" wird zu `broschuere`: ein Umlaut im Variablennamen ist zwar
 * erlaubt, aber jeder, der die Regel spaeter sucht, tippt „broschuere".
 */
const STATUS_STAMM: Record<string, string> = {
  Neu: 'neu',
  Kontaktiert: 'kontaktiert',
  Qualifiziert: 'qualifiziert',
  'Broschüre': 'broschuere',
  Angebot: 'angebot',
  'Warm Halten': 'warm',
  Verhandlung: 'verhandlung',
  Gewonnen: 'gewonnen',
  Verloren: 'verloren',
};

const PRIO_STAMM: Record<string, string> = {
  Hoch: 'hoch',
  Mittel: 'mittel',
  Niedrig: 'niedrig',
};

/**
 * Farbtopf für frei angelegte Status und Etiketten.
 *
 * Die neun Volltöne der Vorgabe, dazu drei weitere. Ein in den Einstellungen
 * selbst angelegter Status hat keine eigene CSS-Variable — er bekommt seine
 * Farbe über einen Hash des Namens und daraus dieselben drei Werte, die die
 * festen Stufen aus theme.css beziehen. So sieht er dazwischen nicht fremd
 * aus.
 *
 * Die drei zusätzlichen (Türkis, Altrosa, Flieder) sind gesucht, nicht
 * gewählt: Kontrast über 4,5 und ΔE über 16 zu jeder anderen, auch bei
 * Grünschwäche, und innerhalb der Farbigkeit und Helligkeit der neun. Beim
 * ersten Anlauf standen hier Grau und Limette — beide fielen durch (ΔE 3,7
 * neben „Neu" und 9,5 neben „Warm Halten"). Beim Ausrechnen aufgefallen,
 * nicht beim Hinsehen.
 */
const LABEL_PALETTE = [
  '#B0C0D1', '#58CEF8', '#5B6EE8', '#DBBFFE', '#FAD03E', '#77818C',
  '#EF852E', '#2FCDA3', '#CC3336', '#37E6CC', '#F6BDB6', '#DBC8E5',
];

function hashColor(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return LABEL_PALETTE[h % LABEL_PALETTE.length];
}

/**
 * Die drei Werte, aus denen ein Statusabzeichen besteht.
 *
 * Für die neun bekannten Stufen kommen sie aus theme.css und kippen dort mit
 * dem Modus. Für frei angelegte werden sie aus der Hash-Farbe gerechnet —
 * mit denselben Alphawerten, damit beide gleich aussehen.
 */
export interface StatusTon {
  /** Getönte Fläche. */
  bg: string;
  /** Schrift. */
  fg: string;
  /** 1-px-Rahmen. */
  border: string;
}

/** `#RRGGBB` → `r, g, b` für rgba(). */
function kanaele(hex: string): string {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(', ');
}

/**
 * Ton eines Status.
 *
 * ─── Warum ein frei angelegter Status anders behandelt wird ────────────────
 *
 * Die neun festen Stufen holen ihre Werte über `var(--status-…)`, weil nur
 * die mit dem Hell-/Dunkelmodus kippen können. Ein selbst angelegter Status
 * hat keine Variable — für ihn wird die Fläche zur Laufzeit aus der
 * Hash-Farbe gemischt.
 *
 * Die Schrift ist dabei NICHT die Grundfarbe selbst. Auf ihrer eigenen
 * 24-%-Tönung kommt sie nicht über 4,5 — bei drei der zwölf Farben lag sie
 * bei 3,1 bis 3,6. Genau die Falle, an der auch der erste Anlauf mit den
 * getönten Abzeichen gescheitert ist: eine Tönung derselben Farbe zieht den
 * Untergrund in Richtung der Schrift.
 *
 * Sie rückt deshalb von ihrer eigenen Fläche weg — im Dunkeln zum Weiss hin,
 * im Hellen zum Schwarz. Beides steckt in `--ton-weg` und
 * `--ton-weg-anteil`, die mit dem Modus kippen; `color-mix` erledigt es im
 * Browser. Das ist der einzige Weg, der ohne Kenntnis des aktuellen Modus in
 * JavaScript auskommt — ein Bauteil, das den Modus beim Zeichnen abfragt,
 * würde beim Umschalten nicht neu zeichnen.
 */
export function statusTon(status?: string): StatusTon {
  const stamm = status ? STATUS_STAMM[status] : undefined;
  if (stamm) {
    return {
      bg: `var(--status-${stamm}-bg)`,
      fg: `var(--status-${stamm}-fg)`,
      border: `var(--status-${stamm}-border)`,
    };
  }
  const basis = status ? hashColor(status) : '#77818C';
  const rgb = kanaele(basis);
  // Dieselben Alphawerte wie die festen Stufen in theme.css — sonst steht ein
  // eigener Status blass zwischen kraeftigen.
  return {
    bg: `rgba(${rgb}, 0.24)`,
    fg: `color-mix(in srgb, ${basis} var(--ton-weg-anteil), var(--ton-weg))`,
    border: `rgba(${rgb}, 0.38)`,
  };
}

/**
 * Vollton eines Status — für Punkte, Balken und Board-Spaltenköpfe.
 *
 * Ausdrücklich NICHT für Flächen mit Text: neun gesättigte Pillen
 * untereinander ziehen die Aufmerksamkeit von den Firmennamen weg. Dafür
 * gibt es `statusTon`.
 *
 * Gibt eine CSS-Variable zurück, keinen HEX-Wert. Die Balken sind Flächen
 * ohne Text und brauchen 3:1 zum Untergrund — im Hellmodus schafft das keiner
 * der hellen Töne (Angebot kommt auf 1,48), sie sind dort entsprechend
 * abgedunkelt. Ein fester HEX-Wert könnte das nicht leisten.
 */
export function statusColor(status?: string): string {
  const stamm = status ? STATUS_STAMM[status] : undefined;
  if (stamm) return `var(--status-${stamm}-voll)`;
  return status ? hashColor(status) : '#77818C';
}

/**
 * Ton einer Priorität — reine Umrandung, keine Fläche.
 *
 * Sonst konkurriert das gelbe „Mittel" mit dem gelben Status „Angebot", und
 * in einer Zeile stehen zwei gelbe Flächen, die verschiedene Dinge meinen.
 */
export function prioTon(priority?: string): { fg: string; border: string } {
  const stamm = priority ? PRIO_STAMM[priority] : undefined;
  if (stamm) return { fg: `var(--prio-${stamm}-fg)`, border: `var(--prio-${stamm}-border)` };
  const basis = priority ? hashColor(priority) : '#8D949C';
  return { fg: basis, border: `rgba(${kanaele(basis)}, 0.42)` };
}

/*
 * ENTFERNT: SolidPill, lesbareSchriftfarbe, PILL_DUNKEL.
 *
 * Die vollflaechigen Statuspillen sind weg. Neun gesaettigte Flaechen
 * untereinander ziehen in einer Tabelle die Aufmerksamkeit von den
 * Firmennamen weg — und darum geht es dort. Der Vollton bleibt, aber nur
 * fuer Punkte, Balken und Board-Spaltenkoepfe (statusColor).
 *
 * `lesbareSchriftfarbe` faellt damit mit weg: sie rechnete die Schriftfarbe
 * aus der Helligkeit der Vollflaeche. Es gibt keine Vollflaeche mit Text
 * mehr, und die Schrift steht ohnehin je Stufe in theme.css.
 */

/**
 * Geometrie der Status- und Prioritaetschips.
 *
 * Aus der Farbvorgabe uebernommen: 26 px hoch, 0/11 px Innenabstand,
 * 7 px Eckradius, 12,5 px Schrift, 1 px Rahmen, kein Verlauf, kein Schatten.
 *
 * 12,5 px gibt es in Tailwind nicht als Stufe — daher die eckige Klammer.
 * Die Hoehe steht als `h-[26px]` und nicht ueber den Innenabstand, damit
 * Chips mit und ohne Symbol gleich hoch bleiben.
 */
const CHIP_STATUS = 'inline-flex h-[26px] items-center gap-1 whitespace-nowrap '
  + 'rounded-[7px] border px-[11px] text-[12.5px] font-semibold leading-none';

/** Prioritaet: eine Stufe kleiner, weil sie neben dem Status steht. */
const CHIP_PRIO = 'inline-flex h-6 items-center gap-1 whitespace-nowrap '
  + 'rounded-md border px-[9px] text-[11.5px] font-semibold leading-none';

/** Statusabzeichen — getoente Flaeche, aufgehellte Schrift, feiner Rahmen. */
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const ton = statusTon(status);
  return (
    <span
      className={cn(CHIP_STATUS, className)}
      style={{ backgroundColor: ton.bg, color: ton.fg, borderColor: ton.border }}
    >
      {status}
    </span>
  );
}

/**
 * Prioritaetschip — reine Umrandung, KEINE Flaeche.
 *
 * Sonst stuenden in derselben Zeile zwei gelbe Flaechen: „Mittel" und der
 * Status „Angebot". Zwei gleiche Flaechen, die verschiedene Dinge meinen,
 * liest man als dieselbe Sache.
 */
export function PriorityPill({ priority, className }: { priority: string; className?: string }) {
  const ton = prioTon(priority);
  return (
    <span
      className={cn(CHIP_PRIO, className)}
      style={{ backgroundColor: 'transparent', color: ton.fg, borderColor: ton.border }}
    >
      {priority}
    </span>
  );
}

/** Inline editierbarer Status (Monday-Style): Pill öffnet ein Farb-Menü. */
export function StatusSelect({
  value,
  options,
  onChange,
  className,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  /**
   * Klappt das Menü nach OBEN auf?
   *
   * ─── Warum das nötig wurde ───────────────────────────────────────────────
   *
   * Das Menü ist absolut positioniert und wird deshalb vom nächsten
   * scrollenden Elternteil beschnitten. Solange die ganze Seite scrollte, war
   * das die Seite selbst — hoch genug, dass es kaum auffiel.
   *
   * Seit die Leadliste eine eigene, bildschirmhohe Spalte ist, ist dieser
   * Elternteil die Spalte. Bei neun Status ist das Menü rund 300 px hoch; in
   * den unteren Zeilen wäre es damit angeschnitten, und man käme an die
   * letzten Einträge nicht heran.
   *
   * Kein Portal: das Menü gehört zu seinem Knopf, und ein Portal müsste die
   * Position beim Scrollen nachführen. Aufklappen nach oben löst dasselbe
   * Problem mit fünf Zeilen.
   */
  const [nachOben, setNachOben] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /**
   * Vor dem Aufklappen entscheiden, in welche Richtung Platz ist.
   *
   * Gemessen wird gegen den Bildschirm und nicht gegen die Spalte: die Spalte
   * reicht bis zum unteren Rand, die Zahlen sind also dieselben — und man
   * muss sich nicht darauf verlassen, welcher Elternteil gerade scrollt.
   */
  const richtungBestimmen = () => {
    const knopf = ref.current?.getBoundingClientRect();
    if (!knopf) return;
    // 32 px je Eintrag plus Rahmen und Innenabstand, grosszuegig geschaetzt.
    const hoehe = Math.min(options.length * 32 + 12, 320);
    const untenFrei = window.innerHeight - knopf.bottom;
    const obenFrei = knopf.top;
    // Nur nach oben, wenn unten wirklich zu wenig ist UND oben mehr Platz ist.
    setNachOben(untenFrei < hoehe + 8 && obenFrei > untenFrei);
  };

  return (
    <div ref={ref} className={cn('relative inline-block', className)}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (!open) richtungBestimmen();
          setOpen((o) => !o);
        }}
        className={cn(CHIP_STATUS, 'transition-opacity hover:opacity-80')}
        style={{
          backgroundColor: statusTon(value).bg,
          color: statusTon(value).fg,
          borderColor: statusTon(value).border,
        }}
      >
        {value}
        <ChevronDown className="size-3 opacity-70" />
      </button>
      {open && (
        <div
          className={cn(
            'absolute z-50 min-w-[170px] rounded-md border border-border-subtle bg-elevated p-1 shadow-modal',
            // Eine eigene Hoechsthoehe mit Scrollen: bei sehr vielen selbst
            // angelegten Status reicht auch nach oben irgendwann der Platz
            // nicht, und ein Menue, das aus dem Bild laeuft, ist schlimmer als
            // eines, in dem man blaettert.
            'max-h-[min(20rem,60vh)] overflow-y-auto overscroll-contain',
            nachOben ? 'bottom-full mb-1' : 'top-full mt-1',
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(opt);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left transition-colors hover:bg-elevated-hover"
            >
              <StatusBadge status={opt} />
              {opt === value && <Check className="size-3.5 text-text-secondary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
 * Button
 * ────────────────────────────────────────────────────────────── */

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md';

const BTN_BASE =
  'inline-flex items-center justify-center gap-2 rounded-lg font-semibold whitespace-nowrap ' +
  'transition-[background-color,border-color,color,box-shadow,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50 ' +
  'disabled:opacity-50 disabled:pointer-events-none';

const BTN_VARIANT: Record<ButtonVariant, string> = {
  /**
   * accent-600, nicht accent-500 — obwohl hier accent-500 stand.
   *
   * Weiss auf accent-500 (#5C8DFF) ergibt im Dunkeln 3,16 und damit zu wenig
   * für Schrift. Genau deshalb nehmen die gefüllten Hauptaktionen im Admin
   * accent-600, und `src/styles/kontrast.test.ts` hält das seit dem Redesign
   * als Regel fest ("Weiss auf accent-500 ist NICHT genug"). Dieser Knopf war
   * die eine Stelle, die sich nicht daran gehalten hat.
   */
  primary: 'bg-accent-600 text-white shadow-sm hover:-translate-y-px hover:bg-accent-700 hover:shadow-card-hover',
  secondary: 'bg-elevated text-text-primary border border-border-subtle hover:bg-elevated-hover hover:border-border-strong',
  outline: 'bg-transparent text-text-primary border border-border-subtle hover:bg-elevated hover:border-border-strong',
  ghost: 'bg-transparent text-text-secondary hover:bg-elevated hover:text-text-primary',
  /* Vollflächig aus demselben Grund wie die Statusfelder: die Schrift lag auf
     einer Tönung ihrer eigenen Farbe und war im Hellmodus unter der Grenze.
     Beim Überfahren wird aufgehellt statt umgefärbt — das trägt in beiden
     Modi, ohne dass es einen zweiten Farbwert braucht. */
  danger: 'bg-status-danger text-auf-ton hover:brightness-110',
};

const BTN_SIZE: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-3.5 text-sm',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', className, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(BTN_BASE, BTN_VARIANT[variant], BTN_SIZE[size], className)}
      {...props}
    />
  );
});

/** Quadratischer Icon-Button. */
export const IconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'default' | 'danger' }
>(function IconButton({ className, tone = 'default', type = 'button', ...props }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center size-9 rounded-md transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50',
        tone === 'danger'
          ? 'text-text-muted hover:bg-status-danger/15 hover:text-status-danger'
          : 'text-text-secondary hover:bg-elevated hover:text-text-primary',
        className,
      )}
      {...props}
    />
  );
});

/* ──────────────────────────────────────────────────────────────
 * Seitenrand
 * ────────────────────────────────────────────────────────────── */

/**
 * Der äussere Rand JEDER Ansicht — eine Quelle für alle.
 *
 * Vorher stand er je Ansicht einzeln und in zwei Fassungen: 20 px (ab mittleren
 * Fenstern 24) in Dashboard, Kalender und Scraper, 24 px (ab mittleren Fenstern
 * 32) in Leads, Pipeline, Berichte,
 * Einstellungen und Benutzern. Beim Wechsel zwischen zwei Ansichten sprang der
 * Inhalt darum um 8 px — sichtbar, aber schwer zu benennen.
 *
 * Wert und Kommentar sind absichtlich gleichlautend mit
 * Admin-Dashboard/src/components/ui/seite.tsx: die beiden Anwendungen laufen
 * nebeneinander, und der Nutzer wechselt oben rechts zwischen ihnen. Der
 * Entwurf setzt `padding: 30px 32px 72px; max-width: 1620px`; hier steht eine
 * Stufe darunter (24/28), weil die Ansicht kleiner werden sollte.
 *
 * Die Maximalbreite stand hier auf 1680, im Admin auf 1280 — 400 px Unterschied
 * in der Textbreite zwischen zwei Anwendungen, die zusammengehören. Jetzt beide
 * auf dem Wert des Entwurfs. Ohne `mx-auto`, wie im Entwurf.
 *
 * `SEITEN_RAND_OHNE_BREITE` ist für Formularansichten, die bewusst schmaler
 * bleiben — Gegenstück zum Admin, wo dieselbe Teilung besteht.
 */
export const SEITEN_RAND_OHNE_BREITE = 'w-full px-4 pb-14 pt-5 md:px-7 md:pt-6';

export const SEITEN_RAND = cn(SEITEN_RAND_OHNE_BREITE, 'max-w-[1620px]');

/* ──────────────────────────────────────────────────────────────
 * Card / Section
 * ────────────────────────────────────────────────────────────── */

export function Card({
  className,
  /** @deprecated Der Randwechsel steckt seit dem Redesign in `.karte` selbst. */
  hover: _hover = false,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { hover?: boolean }) {
  return (
    <div
      className={cn(
        // Karte des Redesigns vom 2026-07-30: senkrechter Lichtverlauf von
        // 4,5 % auf 1,2 % Weiss, 1 px Rand mit 7,5 % Weiss, 18 px Radius.
        // Die Werte stehen EINMAL in theme.css als `.karte` — nicht hier als
        // Klassenkette, sonst laufen sie beim nächsten Wechsel auseinander.
        //
        // `hover` ist damit überflüssig: die Klasse bringt den Randwechsel
        // selbst mit. Die Eigenschaft bleibt für die 37 Aufrufstellen
        // bestehen, tut aber nichts mehr.
        'karte',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

/**
 * Abschnittsmarke: Mono-Versalien, 10 px, weit gesperrt.
 *
 * Werte aus dem Redesign (`font:700 10px/1 'JetBrains Mono'`,
 * `letter-spacing:.2em`). Vorher lief das über `.label-technical` mit 12 px und
 * 0,08 em — merklich grösser und enger als der Entwurf.
 */
export function SectionLabel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        'text-sm font-medium leading-normal text-text-secondary',
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ──────────────────────────────────────────────────────────────
 * PageHeader
 * ────────────────────────────────────────────────────────────── */

export function PageHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    /*
     * ─── Warum hier umbrochen und nicht zerdrückt wird ────────────────────
     *
     * Vorher: `sm:flex-row` mit `flex-shrink-0` auf den Aktionen. Die Knöpfe
     * gaben also nie nach — in einer schmalen Spalte nahmen sie fast die
     * ganze Breite, und der Titelblock (`min-w-0`) wurde auf gut hundert
     * Pixel zusammengedrückt. Der Untertitel stand dann mit EINEM WORT PRO
     * ZEILE untereinander, und daneben blieb eine grosse leere Fläche.
     *
     * Aufgefallen ist es erst, als die Leadliste ihren Kopf in die schmalere
     * Spalte bekam. Der Fehler war aber vorher schon da — er brauchte nur
     * eine Breite, die es bis dahin nicht gab.
     *
     * Jetzt bekommt der Titelblock eine Mindestbreite, unter die er nicht
     * fällt. Reicht der Platz daneben nicht mehr für die Knöpfe, rutschen
     * SIE eine Zeile tiefer — das kostet Höhe, aber nur wenn es nötig ist,
     * und es bleibt lesbar.
     */
    <header className={cn('flex flex-wrap items-end justify-between gap-x-4 gap-y-3', className)}>
      <div className="min-w-[15rem] flex-1">
        {/* 34 px wie im Entwurf, nach unten mitwachsend damit lange Titel auf
            engen Bildschirmen nicht umbrechen. */}
        <h1 className={cn('font-display font-semibold leading-[1.1] tracking-[-0.02em] text-text-primary', SEITEN_TITEL)}>
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 text-[13px] leading-[1.45] text-text-tertiary">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex max-w-full flex-shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/* ──────────────────────────────────────────────────────────────
 * StatCard (KPI)
 * ────────────────────────────────────────────────────────────── */

export function StatCard({
  icon,
  label,
  value,
  hint,
  className,
}: {
  icon?: ReactNode;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  /**
   * ─── Beschriftung links, Wert RECHTS ─────────────────────────────────────
   *
   * Der Wert stand UNTER der Beschriftung. Bei einer Karte, die im Raster gut
   * 380 px breit wird, sass damit alles links und rechts daneben blieb die
   * halbe Karte leer.
   *
   * Eine Zahl wie "€0" oder "0%" fuellt keine 380 px. Also nutzt sie die
   * BREITE statt der Hoehe. Gleicher Aufbau wie im Admin-Dashboard, damit die
   * beiden Anwendungen beim Wechseln nicht auseinanderfallen.
   *
   * ─── Die Unterzeile steht IMMER da ───────────────────────────────────────
   *
   * Von vier Kacheln in den Berichten hatte eine keine Unterzeile ("Ø
   * Abschluss") — und war dadurch sichtbar niedriger als ihre Nachbarn. Der
   * Platz wird jetzt auch dann reserviert, wenn nichts drinsteht.
   *
   * Dazu `h-full`: die Karte sitzt in einer Huelle (Reveal), und ohne das
   * fuellt sie die gestreckte Rasterzelle nicht aus.
   *
   * `min-w-0` und `truncate`: sonst schiebt eine lange Beschriftung den Wert
   * aus der Karte, statt selbst zu kuerzen.
   */
  return (
    <Card className={cn('flex h-full flex-col', KACHEL, className)}>
      <div className="flex flex-1 items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <SectionLabel className="block truncate">{label}</SectionLabel>
          <div className="mt-1 truncate text-[11px] font-medium leading-[1.35] text-text-muted">
            {hint ?? '\u00A0'}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <span className={cn('font-display font-semibold leading-none tabular-nums text-text-primary', KACHEL_ZAHL)}>
            {value}
          </span>
          {icon && <span className="shrink-0 text-text-tertiary">{icon}</span>}
        </div>
      </div>
    </Card>
  );
}

/* ──────────────────────────────────────────────────────────────
 * EmptyState
 * ────────────────────────────────────────────────────────────── */

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    // Gestrichelter Rahmen wie im Entwurf: eine leere Karte sieht nach Fehler
    // aus, eine gestrichelte nach "hier kommt noch etwas".
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg px-6 py-10 text-center',
        className,
      )}
    >
      {icon && (
        <div className="flex size-11 items-center justify-center rounded-[13px] bg-overlay/[0.045] text-text-faint">
          {icon}
        </div>
      )}
      <p className="text-sm font-semibold text-text-tertiary">{title}</p>
      {description && <p className="max-w-sm text-[12px] text-text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
 * Field + gemeinsame Input-Klasse
 * ────────────────────────────────────────────────────────────── */

/** Einheitliche Klasse für native Inputs/Textarea/Select. */
export const inputClass =
  // 10 px Radius und durchscheinende Fläche wie die Felder im Entwurf
  // (rgba(255,255,255,.04) über 1 px rgba(255,255,255,.07)).
  'w-full rounded-md border border-border-strong bg-surface px-3 text-sm text-text-primary ' +
  'placeholder:text-text-muted transition-colors focus:border-accent-500 focus:outline-none';

export const inputSized = cn(inputClass, 'h-9');

export function Field({
  label,
  htmlFor,
  hint,
  required,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const generatedId = useId();
  const childrenArray = Children.toArray(children);
  const control = childrenArray.find((child) => isValidElement(child) && (['input', 'textarea', 'select'].includes(String(child.type)) || (typeof child.type === 'function' && child.type.name === 'CustomSelect'))) as ReactElement<{ id?: string; 'aria-describedby'?: string; 'aria-required'?: boolean }> | undefined;
  const controlId = htmlFor || control?.props.id || generatedId;
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={controlId} className="block text-sm font-medium text-text-secondary">
        {label}
        {required && <span aria-hidden="true" className="ml-0.5 text-status-danger">*</span>}
      </label>
      {childrenArray.map((child) => child === control ? cloneElement(control, { id: controlId, 'aria-required': required || undefined, 'aria-describedby': hint ? `${controlId}-hint` : control.props['aria-describedby'] }) : child)}
      {hint && <p id={`${controlId}-hint`} className="text-xs text-text-muted">{hint}</p>}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
 * Modal — eine Overlay-Konvention für ALLE Dialoge
 * ────────────────────────────────────────────────────────────── */

export function Modal({
  open = true,
  onClose,
  title,
  subtitle,
  size = 'md',
  headerAccessory,
  onBack,
  footer,
  children,
  bodyClassName,
}: {
  open?: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  headerAccessory?: ReactNode;
  /** Optionaler Zurück-Pfeil oben links (z.B. von der Stammdaten-Maske zurück zu den Aktivitäten). */
  onBack?: () => void;
  footer?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const headingId = useId();
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  // Keep focus inside the dialog while its body scrolls independently.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    const focusable = () => Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]') || []).filter((element) => !element.closest('[hidden]'));
    (dialogRef.current?.querySelector<HTMLElement>('input, textarea, select') || focusable()[0])?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); closeRef.current(); }
      if (e.key === 'Tab') { const controls = focusable(); const first = controls[0]; const last = controls[controls.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); } }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
      previousFocus?.focus();
    };
  }, [open]);

  if (!open) return null;

  const maxW = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-5xl',
  }[size];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? headingId : undefined}
    >
      <div
        className={cn(
          'flex max-h-[calc(100dvh-32px)] w-full flex-col overflow-hidden rounded-lg border border-border-subtle bg-surface shadow-modal',
          maxW,
        )}
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || subtitle || headerAccessory || onBack) && (
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border-subtle px-5 py-4">
            <div className="flex min-w-0 items-center gap-3">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  aria-label="Zurück"
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-text-muted ring-1 ring-inset ring-border-subtle transition-colors hover:bg-elevated hover:text-text-primary"
                >
                  <ArrowLeft className="size-4" />
                </button>
              )}
              <div className="min-w-0">
                {title && (
                  <h2 id={headingId} className="font-display text-lg font-semibold tracking-tight text-text-primary">
                    {title}
                  </h2>
                )}
                {subtitle && <p className="mt-0.5 text-sm text-text-muted">{subtitle}</p>}
              </div>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              {headerAccessory}
              <IconButton onClick={onClose} aria-label="Schließen">
                <X className="size-4" />
              </IconButton>
            </div>
          </div>
        )}
        <div className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5', bodyClassName)}>{children}</div>
        {footer && (
          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border-subtle px-5 py-4 sm:flex-row sm:items-center sm:justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export { cn };
