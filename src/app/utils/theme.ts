/**
 * Hell/Dunkel-Umschalter.
 *
 * Das Attribut `data-theme` auf <html> steuert den Tokensatz in
 * src/styles/theme.css. Dunkel ist die Vorgabe — der Entwurf ist dunkel
 * gezeichnet, und wer nichts wählt, soll ihn so sehen.
 *
 * Die Wahl liegt im localStorage, nicht auf dem Server: es ist eine
 * Anzeigeentscheidung eines Menschen an einem Gerät. Wer am Empfang einen
 * hellen Bildschirm braucht, soll damit nicht die Ansicht der Kollegin am
 * dunklen Arbeitsplatz umstellen.
 *
 * Jeder Zugriff ist abgefangen: in einem privaten Fenster wirft localStorage,
 * und dann darf nicht die ganze Anwendung stehen bleiben — sie zeigt eben
 * dunkel.
 *
 * Diese Datei hat es hier schon einmal gegeben und wurde entfernt, als der
 * Hellmodus mit dem Redesign entfiel. Sie ist zurück, weil der Hellmodus zurück
 * ist — jetzt aber auf Grundlage von --overlay, das die durchscheinenden
 * Flächen kippen kann.
 */

export type Theme = 'light' | 'dark';

const SCHLUESSEL = 'crm_theme';

export function getTheme(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

export function setTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
  try {
    window.localStorage.setItem(SCHLUESSEL, theme);
  } catch {
    /* Keine Erinnerung — die Umstellung gilt trotzdem für diese Sitzung. */
  }
}

export function toggleTheme(): Theme {
  const next: Theme = getTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}

/**
 * Beim Start anwenden.
 *
 * index.html setzt das Attribut schon VOR dem ersten Zeichnen — sonst blitzt
 * einmal die dunkle Fassung auf und springt dann auf hell. Diese Funktion
 * gleicht nur nach, falls das Skript dort nicht lief.
 */
export function applyStoredTheme(): void {
  try {
    const v = window.localStorage.getItem(SCHLUESSEL);
    setTheme(v === 'dark' ? 'dark' : 'light');
  } catch {
    setTheme('light');
  }
}
