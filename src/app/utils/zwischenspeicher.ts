/**
 * Kurzzeit-Zwischenspeicher für Leseabfragen.
 *
 * ─── Warum es das gibt ─────────────────────────────────────────────────────
 *
 * Das CRM baut bei JEDEM Ansichtswechsel die Ansicht komplett neu auf — die
 * Ansichten werden bedingt gerendert, der alte Baum verschwindet also. Jede
 * Ansicht holt sich beim Aufbau ihre Daten neu. Wer zwischen Leads und
 * Kalender hin- und herspringt, lädt die Leadliste jedes Mal von vorn: 533
 * Datensätze, 405 KB, die geholt, entpackt und gezeichnet werden wollen —
 * obwohl sich in den zwei Sekunden nichts geändert hat.
 *
 * ─── Warum kein react-query ────────────────────────────────────────────────
 *
 * Im Admin-Dashboard liegt eines, hier nicht. Eines nachzurüsten hieße, alle
 * vierzehn Ansichten umzubauen. Das hier sind sechzig Zeilen und greift eine
 * Ebene tiefer: in storage.ts, wo die Abfragen ohnehin durchlaufen. Keine
 * Ansicht muss dafür angefasst werden.
 *
 * ─── Die Abwägung, offen benannt ───────────────────────────────────────────
 *
 * Zwischengespeicherte Daten können veraltet sein. Deshalb:
 *
 *  - Nur 60 Sekunden. Lang genug fürs Hin- und Herspringen, kurz genug, dass
 *    man an fremden Änderungen nicht lange vorbeiarbeitet.
 *  - JEDE eigene Änderung wirft den Eintrag weg (`vergessen`). Was man selbst
 *    gerade gespeichert hat, sofort veraltet zu sehen, wäre unerträglich —
 *    und das ist der weitaus häufigere Fall.
 *  - Der Aktualisieren-Knopf leert alles. Sonst würde er lügen.
 *
 * Was ein fremder Kollege in derselben Minute ändert, sieht man bis zu eine
 * Minute später. Dafür ist der Wechsel zwischen zwei Ansichten sofort da.
 *
 * ─── Gleichzeitige Abfragen ────────────────────────────────────────────────
 *
 * Es wird nicht nur das ERGEBNIS gemerkt, sondern auch die noch laufende
 * Abfrage. Zwei Bestandteile, die im selben Moment dasselbe anfordern —
 * im Entwicklungsmodus führt React jeden Effekt absichtlich zweimal aus —
 * teilen sich damit eine einzige Anfrage statt zwei zu stellen.
 */

/** Wie lange ein Eintrag gilt. Siehe Abwägung oben. */
const HALTBAR_MS = 60_000;

interface Eintrag<T> {
    /** Fertiges Ergebnis, sobald die Abfrage durch ist. */
    wert?: T;
    /** Zeitpunkt, zu dem `wert` eintraf. */
    seit?: number;
    /** Noch laufende Abfrage — damit sich Gleichzeitige eine teilen. */
    laeuft?: Promise<T>;
}

const speicher = new Map<string, Eintrag<unknown>>();

/**
 * Liefert den gemerkten Wert, sonst das Ergebnis von `laden`.
 *
 * `laden` wird nur aufgerufen, wenn nichts Gültiges dasteht und auch nichts
 * unterwegs ist.
 */
export async function merken<T>(schluessel: string, laden: () => Promise<T>): Promise<T> {
    const jetzt = Date.now();
    const vorhanden = speicher.get(schluessel) as Eintrag<T> | undefined;

    if (vorhanden?.seit !== undefined && jetzt - vorhanden.seit < HALTBAR_MS) {
        return vorhanden.wert as T;
    }
    if (vorhanden?.laeuft) return vorhanden.laeuft;

    const laeuft = laden().then(
        (wert) => {
            speicher.set(schluessel, { wert, seit: Date.now() });
            return wert;
        },
        (fehler) => {
            // Ein Fehlschlag darf sich NICHT festsetzen: bliebe die
            // gescheiterte Abfrage stehen, bekaeme jeder weitere Aufruf
            // denselben Fehler zurueck, bis die Haltbarkeit ablaeuft.
            speicher.delete(schluessel);
            throw fehler;
        },
    );
    speicher.set(schluessel, { laeuft });
    return laeuft;
}

/**
 * Wirft einen Eintrag weg — oder alle, wenn kein Schlüssel angegeben ist.
 *
 * Mit Schlüssel nach jeder eigenen Änderung, ohne Schlüssel beim
 * Aktualisieren-Knopf und beim Abmelden (sonst sähe der nächste Anmelder
 * kurz die Daten des vorigen).
 */
export function vergessen(schluessel?: string): void {
    if (schluessel === undefined) speicher.clear();
    else speicher.delete(schluessel);
}

/**
 * Wirft alle Einträge weg, deren Schlüssel so beginnt.
 *
 * Für die Termine: deren Schlüssel trägt den abgefragten Zeitraum mit sich,
 * es liegen also mehrere nebeneinander („termine:?from=…"). Wer einen Termin
 * verschiebt, weiss nicht, in welchen Zeitraum er vorher fiel und in welchen
 * jetzt — beide müssen weg. Ein Verschieben über eine Monatsgrenze hinweg
 * liesse ihn sonst doppelt erscheinen: im alten Monat noch, im neuen schon.
 */
export function vergessenMitPraefix(praefix: string): void {
    for (const schluessel of [...speicher.keys()]) {
        if (schluessel.startsWith(praefix)) speicher.delete(schluessel);
    }
}

/** Schlüssel an einer Stelle, damit sich Merken und Vergessen nie verfehlen. */
export const SCHLUESSEL = {
    leads: 'leads',
    leadListen: 'leadListen',
    termine: (zusatz: string) => `termine:${zusatz}`,
    termineAdmins: 'termineAdmins',
} as const;
