/**
 * CSV-Import — die Fälle, die im Alltag wirklich vorkommen.
 *
 * Anlass: In `parseCsv` und `mapHeaders` stand das BOM-Zeichen (U+FEFF) als
 * unsichtbares Zeichen direkt im regulären Ausdruck. Es sah aus wie `/^/` und
 * damit wie ein Ausdruck, der nichts tut. Beim Umstellen auf die sichtbare
 * Schreibweise `\uFEFF` muss beweisbar dasselbe herauskommen — sonst bricht der
 * Excel-Import still an der ersten Spalte, und zwar so, dass es niemandem
 * auffällt: die Spalte heißt dann nicht "firma", sondern "<U+FEFF>firma", wird
 * nicht zugeordnet, und der Import läuft scheinbar sauber durch.
 *
 * Excel schreibt dieses BOM bei "CSV UTF-8" immer. Der Fall ist also nicht
 * exotisch, sondern der Normalfall.
 */
import { describe, expect, it } from 'vitest';

import { parseCsv, parseRows } from './importCsv';

const BOM = '\uFEFF';

describe('parseCsv', () => {
    it('entfernt das BOM, das Excel voranstellt', () => {
        const rows = parseCsv(`${BOM}firma;ort\nMueller GmbH;Koeln`, ';');
        expect(rows[0]).toEqual(['firma', 'ort']);
    });

    it('laesst Zeilen ohne BOM unveraendert', () => {
        expect(parseCsv('firma;ort\nMueller GmbH;Koeln', ';')[0]).toEqual(['firma', 'ort']);
    });

    it('achtet Anfuehrungszeichen samt eingebettetem Trennzeichen', () => {
        const rows = parseCsv('firma;ort\n"Mueller; Sohn GmbH";Koeln', ';');
        expect(rows[1]).toEqual(['Mueller; Sohn GmbH', 'Koeln']);
    });

    it('achtet Zeilenumbrueche innerhalb von Anfuehrungszeichen', () => {
        const rows = parseCsv('firma;notiz\n"Mueller GmbH";"Zeile 1\nZeile 2"', ';');
        expect(rows).toHaveLength(2);
        expect(rows[1][1]).toBe('Zeile 1\nZeile 2');
    });

    it('macht aus verdoppelten Anfuehrungszeichen eines', () => {
        expect(parseCsv('a\n"Er sagte ""Hallo"""', ';')[1][0]).toBe('Er sagte "Hallo"');
    });

    it('kommt mit Komma als Trennzeichen zurecht', () => {
        expect(parseCsv('firma,ort\nMueller GmbH,Koeln', ',')[1]).toEqual(['Mueller GmbH', 'Koeln']);
    });
});

describe('parseRows', () => {
    const ZEILEN = 'firma;ort\nMueller GmbH;Koeln';

    it('erkennt die Pflichtspalte trotz BOM davor', () => {
        // Haelt das Verhalten fest, nicht eine bestimmte Umsetzung: Eine
        // Excel-Datei mit BOM muss importierbar sein. Die Gegenprobe zeigte,
        // dass dieser Fall doppelt abgesichert ist — parseCsv() entfernt das
        // BOM, und .trim() wuerde es ohnehin entfernen, weil ECMAScript U+FEFF
        // zu WhiteSpace zaehlt. Der Test bleibt trotzdem: er beschreibt, was
        // gelten muss, nicht wie es erreicht wird.
        const mit = parseRows(`${BOM}${ZEILEN}`);
        expect(mit.error).toBe('');
        expect(mit.rows).toEqual(parseRows(ZEILEN).rows);
    });

    it('ist unabhaengig von Gross- und Kleinschreibung und Leerraum', () => {
        const r = parseRows('  FIRMA  ;Ort\nMueller GmbH;Koeln');
        expect(r.error).toBe('');
        expect(r.rows[0].company).toBe('Mueller GmbH');
    });

    it('meldet eine fehlende Pflichtspalte statt still nichts zu importieren', () => {
        const r = parseRows('ort;telefon\nKoeln;0221');
        expect(r.error).toContain('Firma');
        expect(r.rows).toHaveLength(0);
    });

    it('ordnet deutsche und englische Spaltennamen demselben Feld zu', () => {
        const de = parseRows('firma;e-mail;telefon\nMueller GmbH;a@b.de;0221');
        const en = parseRows('company;email;phone\nMueller GmbH;a@b.de;0221');
        expect(de.rows).toEqual(en.rows);
    });
});
