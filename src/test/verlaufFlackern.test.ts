/**
 * Verläufe dürfen nicht überblendet werden.
 *
 * Anlass: der Knopf „Neuer Lead" flackerte beim Klick. Ursache war
 * `transition-all` zusammen mit einem Verlaufswechsel beim Überfahren
 * (`hover:from-…`). Ein `linear-gradient` ist keine überblendbare Eigenschaft —
 * der Browser springt hart von einem zum anderen. Beim Klick fallen Überfahren,
 * Gedrückt und Fokusring zusammen, und drei harte Sprünge hintereinander sieht
 * man als Flackern.
 *
 * Der Fehler erzeugt keine Warnung. Man sieht ihn nur, wenn man klickt und
 * genau hinschaut — deshalb liest dieser Test den Quelltext.
 *
 * Erlaubt bleibt: ein STATISCHER Verlauf plus eine Überblendung des Schattens
 * (der ist überblendbar).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function dateien(ordner: string, treffer: string[] = []): string[] {
    for (const name of readdirSync(ordner)) {
        const pfad = join(ordner, name);
        if (statSync(pfad).isDirectory()) dateien(pfad, treffer);
        else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) treffer.push(pfad);
    }
    return treffer;
}

const QUELLEN = dateien(join(process.cwd(), 'src'));
const kurz = (p: string) => p.replace(process.cwd() + '/', '');

describe('Verläufe springen, also nicht überblenden', () => {
    it('kein hover:from-/hover:to- irgendwo', () => {
        const funde: string[] = [];
        for (const pfad of QUELLEN) {
            for (const [i, zeile] of readFileSync(pfad, 'utf8').split('\n').entries()) {
                if (/hover:(from|to|via)-[a-z0-9-]+/.test(zeile)) funde.push(`${kurz(pfad)}:${i + 1}`);
            }
        }
        expect(
            funde,
            'Verlaufswechsel beim Überfahren springt hart und flackert beim Klick. '
            + 'Verlauf statisch lassen und nur den Schatten überblenden.',
        ).toEqual([]);
    });

    it('kein transition-all auf einer Fläche mit Verlauf', () => {
        const funde: string[] = [];
        for (const pfad of QUELLEN) {
            for (const [i, zeile] of readFileSync(pfad, 'utf8').split('\n').entries()) {
                if (zeile.includes('transition-all') && /bg-gradient-to-/.test(zeile)) {
                    funde.push(`${kurz(pfad)}:${i + 1}`);
                }
            }
        }
        expect(
            funde,
            'transition-all versucht auch background-image zu überblenden. '
            + 'Nimm transition-shadow oder transition-colors.',
        ).toEqual([]);
    });
});
