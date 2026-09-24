/**
 * Jede Änderung muss den Zwischenspeicher entwerten.
 *
 * ─── Warum das ein Test wert ist ───────────────────────────────────────────
 *
 * Ein Zwischenspeicher ohne Entwertung ist schlimmer als keiner: man
 * speichert einen Lead, die Ansicht baut sich neu auf, und man sieht seinen
 * eigenen alten Stand. Das sieht aus wie Datenverlust — und man speichert
 * nochmal, und nochmal.
 *
 * Der Fehler entsteht nicht beim Bauen, sondern später: jemand fügt eine
 * neue Änderungsfunktion hinzu und denkt nicht an die Zeile. Deshalb prüft
 * dieser Test die QUELLE und nicht das Verhalten — er soll auch bei einer
 * Funktion anschlagen, die es heute noch gar nicht gibt.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const QUELLE = readFileSync('src/app/utils/storage.ts', 'utf8');

/** Der Rumpf einer Funktion bis zur nächsten Deklaration auf Spaltenanfang. */
function rumpf(name: string): string {
    const start = QUELLE.indexOf(`export async function ${name}(`);
    if (start < 0) throw new Error(`${name} gibt es nicht mehr — Test anpassen`);
    const naechste = QUELLE.indexOf('\nexport ', start + 1);
    return QUELLE.slice(start, naechste < 0 ? undefined : naechste);
}

describe('Entwertung des Zwischenspeichers', () => {
    it.each([
        'saveLead', 'deleteLead', 'mergeLeads', 'resolveDuplicates', 'importScraped',
        'createLeadList', 'deleteLeadList', 'addLeadsToList', 'removeLeadsFromList',
    ])('%s wirft die gemerkte Leadliste weg', (name) => {
        expect(rumpf(name)).toMatch(/vergessen\(/);
    });

    it.each([
        'createAppointment', 'updateAppointment', 'cancelAppointment', 'deleteAppointment',
    ])('%s wirft ALLE gemerkten Zeiträume weg', (name) => {
        // Nicht vergessen(SCHLUESSEL.termine(…)): wer einen Termin verschiebt,
        // weiss nicht, in welchem Zeitraum er vorher lag.
        expect(rumpf(name)).toMatch(/vergessenMitPraefix\('termine:'\)/);
    });

    it('das Abmelden leert alles', () => {
        expect(rumpf('logout')).toMatch(/clearSession\(\)/);
        const start = QUELLE.indexOf('function clearSession()');
        expect(QUELLE.slice(start, start + 400)).toMatch(/vergessen\(\)/);
    });

    it('gelesen wird nur ueber merken, nie am Zwischenspeicher vorbei', () => {
        for (const name of ['getLeads', 'getLeadLists', 'getAppointments', 'getAppointmentAdmins']) {
            expect(rumpf(name), `${name} holt direkt statt ueber merken`).toMatch(/merken\(/);
        }
    });
});
