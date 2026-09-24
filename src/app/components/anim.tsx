/**
 * anim — Einblendungen ohne JavaScript-Bibliothek.
 *
 * ─── Warum hier nichts mehr aus `motion/react` importiert wird ─────────────
 *
 * Diese Datei hat `motion` und `AnimatePresence` weitergereicht. Das war
 * bequem und kostete 111 KB: WER AUCH IMMER etwas von hier importierte — die
 * Übersicht wegen `Reveal`, die Berichte wegen `AnimatedNumber` — zog die
 * ganze Bibliothek mit, obwohl beide sie gar nicht benutzen. Ein Import auf
 * Modulebene fragt nicht, was man davon braucht.
 *
 * Gebraucht wird sie nur noch von der Befehlspalette, und die holt sie sich
 * jetzt selbst. Die Palette wird nachgeladen und öffnet erst auf ⌘K — damit
 * zahlt niemand mehr dafür, der sie nie aufmacht.
 *
 * Was hier bleibt, läuft über `.einblenden` und `.ansicht-herein` in
 * premium.css. Beide berücksichtigen `prefers-reduced-motion` selbst.
 */
import { type ReactNode } from 'react';

/**
 * Gestaffelt einblendender Wrapper (für Kachelreihen, Listen …).
 *
 * ─── Warum das keine Bewegungsbibliothek mehr benutzt ──────────────────────
 *
 * Es lief über `motion` mit staggerChildren. Die Übersicht ist die
 * Startansicht, also wurde die Bibliothek direkt nach dem Anmelden geladen:
 * 111 KB für eine Einblendung, die der Browser selbst beherrscht. Dieselben
 * Werte stehen jetzt als `.einblenden` in premium.css.
 *
 * Name und Schnittstelle bleiben unverändert, damit keine der vier
 * Aufrufstellen angefasst werden muss — wie schon bei `AnimatedNumber`.
 *
 * `prefers-reduced-motion` berücksichtigt die CSS-Regel selbst; der frühere
 * `useReducedMotion`-Haken wird dafür nicht mehr gebraucht.
 */
export function Reveal({
  children,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'ul';
}) {
  return <Tag className={className ? `einblenden ${className}` : 'einblenden'}>{children}</Tag>;
}

/**
 * Einzelnes Kind eines <Reveal>.
 *
 * Trägt selbst keine Klasse mehr — die Verzögerung kommt über `nth-child`
 * vom Elternteil. Das Bauteil bleibt trotzdem bestehen: es macht an der
 * Aufrufstelle sichtbar, was zusammengehört, und ohne es müsste man an
 * vierzehn Stellen aufpassen, dass die Kinder direkte Kinder bleiben.
 */
export function Item({
  children,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'li';
}) {
  return <Tag className={className}>{children}</Tag>;
}

/** Animierte Zahl (Count-up). Formatter optional. */
/**
 * Die Zahl steht sofort da. Punkt.
 *
 * Hier stand ein Zaehlwerk (900 ms von 0 zum Zielwert). Ein Zaehlwerk ist
 * fuer den Betrachter nicht von Ladezeit zu unterscheiden — es IST
 * wahrgenommene Ladezeit. Der Wunsch des Nutzers war woertlich: "ich will
 * da drauf klicken und direkt beim dashboard sein." Gleichlautend im
 * Admin-Dashboard entfernt; die beiden Anwendungen sollen sich beim Wechseln
 * gleich anfuehlen.
 *
 * Name und Schnittstelle bleiben, damit die Aufrufstellen unveraendert sind.
 */
export function AnimatedNumber({
  value,
  format = (n) => Math.round(n).toLocaleString('de-DE'),
  className,
}: {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
}) {
  return <span className={className}>{format(value)}</span>;
}

