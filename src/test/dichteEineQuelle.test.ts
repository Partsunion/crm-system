/**
 * Die Dichte der Oberfläche kommt aus dichte.ts — und nur von dort.
 *
 * ─── Warum das ein Test ist ────────────────────────────────────────────────
 *
 * Dieselbe Prüfung liegt im Admin-Dashboard, und aus demselben Grund: die
 * Werte standen an vielen Orten leicht verschieden — 132 px Kachelhöhe hier,
 * 152 px im Admin, Innenabstände von 20, 24 und 32 px nebeneinander.
 *
 * Beim Auftrag „mach alles kompakter" fällt so etwas nicht auf: man dreht ein
 * paar Zahlen, übersieht die übrigen, und die übersehene Ansicht sieht danach
 * falsch aus, ohne dass irgendwo ein Fehler entsteht.
 *
 * Der Test prüft bewusst den ORT und nicht die Zahl: wie kompakt es sein soll,
 * entscheidet der Nutzer — aber es soll an einer Stelle entschieden werden.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const QUELLE = 'src/app/components/dichte.ts';

function alleAnsichten(verzeichnis = 'src'): string[] {
    const gefunden: string[] = [];
    for (const eintrag of readdirSync(verzeichnis)) {
        const pfad = join(verzeichnis, eintrag);
        if (statSync(pfad).isDirectory()) gefunden.push(...alleAnsichten(pfad));
        else if (/\.tsx$/.test(eintrag) && !/\.test\.tsx$/.test(eintrag)) gefunden.push(pfad);
    }
    return gefunden;
}

/** Kommentare raus — sonst meldet der Test seine eigenen Beispiele. */
function ohneKommentare(quelle: string): string {
    return quelle.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

describe('Dichte kommt aus einer Quelle', () => {
    it('keine Ansicht setzt eine eigene Kachelhöhe', () => {
        // 100–199 px ist der Bereich, in dem Kacheln liegen. Ein
        // `min-h-[60vh]` fuer einen Leerzustand ist etwas anderes.
        const sünder: string[] = [];
        for (const datei of alleAnsichten()) {
            const treffer = ohneKommentare(readFileSync(datei, 'utf8')).match(/min-h-\[1[0-9]{2}px\]/g);
            if (treffer) sünder.push(`${datei}: ${treffer.join(', ')}`);
        }
        expect(sünder, `eigene Kachelhoehe statt KACHEL aus ${QUELLE}`).toEqual([]);
    });

    it('keine Karte traegt ihren eigenen Innenabstand', () => {
        /**
         * Karten bekommen KARTE_INNEN. Ein `p-5` an einer Karte ist der
         * Rueckfall in den Zustand von vorher — 16 px hier, 20 dort, 24
         * woanders.
         */
        const sünder: string[] = [];
        for (const datei of alleAnsichten()) {
            const code = ohneKommentare(readFileSync(datei, 'utf8'));
            for (const m of code.matchAll(/<Card\b[^>]*?>/gs)) {
                const treffer = m[0].match(/\b(?:md:|lg:)?p-[5-9]\b/g);
                if (treffer) sünder.push(`${datei}: ${treffer.join(', ')}`);
            }
        }
        expect(sünder, `eigener Kartenrand statt KARTE_INNEN aus ${QUELLE}`).toEqual([]);
    });

    it('keine Ansicht setzt eine eigene Schriftgroesse', () => {
        /**
         * Die Übersicht hatte eine eigene Überschriftsgrösse (26-42 px),
         * während der PageHeader 22-28 benutzte — zwei Grössen für dieselbe
         * Sache in derselben Anwendung. Wer eine neue Grösse braucht, gibt
         * ihr in dichte.ts einen Namen; dann sieht der Nächste, dass es sie
         * schon gibt.
         */
        const suender: string[] = [];
        for (const datei of alleAnsichten()) {
            const treffer = ohneKommentare(readFileSync(datei, 'utf8')).match(/text-\[clamp\([^\]]+\]/g);
            if (treffer) suender.push(`${datei}: ${treffer.join(', ')}`);
        }
        expect(suender, `eigene Schriftgroesse statt eines Namens aus ${QUELLE}`).toEqual([]);
    });

    it('die Quelle bietet alles an, was gebraucht wird', () => {
        const quelle = readFileSync(QUELLE, 'utf8');
        for (const name of ['KARTE_INNEN', 'KACHEL', 'KACHEL_ZAHL', 'SEITEN_TITEL', 'KALENDER_ZELLE']) {
            expect(quelle, `${name} fehlt in ${QUELLE}`).toMatch(new RegExp(`export const ${name}\\b`));
        }
    });

});
