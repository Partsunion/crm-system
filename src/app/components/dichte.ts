/**
 * Dichte der Oberfläche — an EINER Stelle.
 *
 * ─── Warum das eine eigene Datei ist ───────────────────────────────────────
 *
 * Wert und Aufbau sind absichtlich gleichlautend mit
 * Admin-Dashboard/src/components/ui/dichte.ts. Die beiden Anwendungen laufen
 * nebeneinander, und der Nutzer wechselt oben rechts zwischen ihnen — springt
 * dabei die Kachelhöhe, sieht es nach zwei verschiedenen Programmen aus.
 *
 * Dasselbe Muster wie SEITEN_RAND in ui-kit.tsx und aus demselben Grund: eine
 * Zeile drehen, alles zieht mit. Vorher standen im CRM 132 px Kachelhöhe, im
 * Admin 152 px, und die Innenabstände lagen bei 20, 24 und 32 px
 * nebeneinander.
 *
 * ─── Woher die Werte kommen ────────────────────────────────────────────────
 *
 * Der Auslöser war ein MacBook Pro 13". Dort deckten wenige Kacheln die halbe
 * Fensterhöhe ab, und eine Karte mit einer einzigen Zahl bestand zur Hälfte
 * aus Leerraum.
 *
 * Die Kachelhöhe ist am INHALT bemessen und nicht am Entwurf. Im Browser
 * nachgemessen statt gerechnet: Kopfzeile 15, Abstand 10, Zahl 22,
 * Innenabstand 2 × 16 — zusammen 81 px.
 *
 * 68 px, seit Beschriftung und Wert im Admin-Dashboard in EINER Zeile stehen —
 * links der Text, rechts die Zahl. Vorher stand der Wert darunter, und bei
 * einer Karte von rund 390 px Breite blieb die halbe Fläche rechts leer.
 *
 * Die Zahlen stehen hier bewusst als Fliesstext und NICHT in der Schreibweise
 * einer Klasse: Tailwind durchsucht auch Kommentare und legt für jede Klasse,
 * die es dort findet, eine Regel an — sonst stehen tote Regeln in der
 * ausgelieferten CSS, nur weil jemand erklärt hat, was früher galt.
 */

/** Innenabstand einer Karte. 16 px statt 20–32. */
export const KARTE_INNEN = 'p-4';

/** Shared workspace hierarchy; compact tables retain KARTE_INNEN. */
export const WORKSPACE_CARD_INNER = 'p-4 sm:p-5';
export const WORKSPACE_METRIC = 'min-h-[76px] px-3.5 py-3 sm:px-4';
export const WORKSPACE_METRIC_VALUE = 'text-[clamp(1.25rem,1.6vw,1.55rem)]';
export const WORKSPACE_METRIC_VALUE_LONG = 'text-[clamp(1rem,3.8vw,1.35rem)] sm:text-[clamp(1.15rem,1.5vw,1.45rem)]';

/** Kennzahl-Kachel: Beschriftung oben, Wert darunter. */
export const KACHEL = 'min-h-[68px] gap-2.5 p-4';

/** Schriftgrad der grossen Zahl in einer Kachel. */
export const KACHEL_ZAHL = 'text-[clamp(1.375rem,1.9vw,1.75rem)]';

/**
 * Überschrift einer Ansicht.
 *
 * Vorher bis 34 px. Auf einem 13-Zoll-Bildschirm nimmt eine Zeile damit mehr
 * Platz ein als die erste Kachelreihe darunter.
 */
export const SEITEN_TITEL = 'text-[clamp(1.5rem,2.2vw,2rem)]';

/**
 * Höhe einer Kalenderzelle im Monatsraster.
 *
 * 72 px trägt drei Termin-Zeilen plus die Tageszahl. Bei 92 px passten sechs
 * Wochen nicht mehr auf einen 13-Zoll-Bildschirm.
 */
export const KALENDER_ZELLE = 'min-h-[72px]';

/**
 * Karte, die einen Leerzustand trägt („keine Einträge").
 *
 * Hier ist grosszügiger Abstand richtig: der Text steht mittig und allein,
 * und eine enge Karte mit einem Satz darin sieht nach Fehler aus statt nach
 * Ruhe. Die Ausnahme steht mit Absicht HIER und nicht als freie Zahl in der
 * Ansicht — sonst ist sie beim nächsten Mal keine Ausnahme mehr, sondern
 * einfach ein weiterer abweichender Wert.
 */
export const LEER_INNEN = 'p-8 text-center';

/*
 * ENTFERNT: KOPF_HOEHE, MASKE_ABSTAND, MASKE_HOEHE.
 *
 * Die drei Werte waren dazu da, die Hoehe der klebenden Lead-Detailmaske
 * auszurechnen: Bildschirmhoehe minus Kopfzeile minus Abstand oben und unten.
 * Die Rechnung war richtig — aber sie war ueberhaupt nur noetig, weil die
 * Maske klebte, waehrend die Seite darunter scrollte.
 *
 * Seit die Ansicht den Bildschirm ausfuellt (VOLLE_HOEHE weiter unten), ist
 * die Maske einfach so hoch wie ihre Spalte. Es gibt nichts mehr
 * auszurechnen, also auch nichts mehr, was auseinanderlaufen kann.
 *
 * Das ist die bessere Loesung fuer dasselbe Problem: nicht eine Rechnung
 * absichern, sondern die Rechnung ueberfluessig machen.
 *
 * Die feste Hoehe der Kopfzeile bleibt bestehen — sie steht jetzt direkt in
 * layout/Topbar.tsx. Sie wird zwar nicht mehr nachgerechnet, aber eine
 * Kopfzeile, die unbemerkt waechst, nimmt der Arbeitsflaeche darunter Platz
 * weg. arbeitsflaeche.test.ts prueft, dass ihr Inhalt hineinpasst.
 */

/**
 * Eine Ansicht, die den Bildschirm ausfüllt statt mitzuscrollen.
 *
 * ─── Warum es das gibt ─────────────────────────────────────────────────────
 *
 * In der Leadliste gab es ZWEI Scrollbereiche nebeneinander: die Seite selbst
 * und die Detailmaske rechts. Um einen Lead ganz zu sehen, musste man in der
 * Maske scrollen — und um die Liste weiterzulesen, die Seite. Wer mit dem
 * Rad über der Maske ans Ende kam, scrollte plötzlich die Seite weiter, und
 * die Maske wanderte mit. Zwei Bereiche, die sich gegenseitig verschieben.
 *
 * Mit dieser Klasse füllt die Ansicht genau den verfügbaren Platz. Die Seite
 * scrollt dann gar nicht mehr — es scrollt nur noch die Spalte, über der der
 * Zeiger steht. Das ist der Aufbau, den jedes Mailprogramm hat, und aus
 * demselben Grund.
 *
 * `min-h-0` ist nicht schmückend: ein Flex-Kind hat als Mindesthöhe seinen
 * Inhalt, nicht null. Ohne die Regel wächst die Spalte über den Bildschirm
 * hinaus, statt zu scrollen, und die ganze Konstruktion fällt auf den
 * vorigen Zustand zurück — sichtbar erst, wenn genug Zeilen da sind.
 */
export const VOLLE_HOEHE = 'flex h-full min-h-0 flex-col';

/** Kopfbereich einer solchen Ansicht: bleibt stehen, scrollt nicht mit. */
export const KOPF_BEREICH = 'shrink-0 px-4 pt-5 md:px-7 md:pt-6';

/**
 * Die Arbeitsfläche darunter — nimmt den Rest und lässt ihre Spalten
 * jeweils für sich scrollen.
 */
export const ARBEITSFLAECHE = 'flex min-h-0 flex-1 gap-5 px-4 pb-5 md:px-7';

/**
 * Eine Spalte, die für sich scrollt.
 *
 * `overscroll-contain` ist der eigentliche Punkt: ohne die Regel scrollt der
 * Browser am Ende einer Spalte einfach den nächsten Bereich weiter. Genau
 * dieses Durchrutschen war das, was sich „dynamisch" anfühlte.
 */
export const SPALTE_SCROLLT = 'min-h-0 overflow-y-auto overscroll-contain';
