/**
 * Der Seitenrand steht an EINER Stelle — und bleibt dort.
 *
 * Gegenstück zu Admin-Dashboard/src/test/seitenrandEinheitlich.test.ts. Dort
 * steht die ausführliche Begründung; hier die Fassung für das CRM.
 *
 * ─── Was hier schiefging ───────────────────────────────────────────────────
 *
 * Der äussere Rand war je Ansicht hingeschrieben, in zwei Fassungen:
 *
 *   p-5 md:p-6   in Dashboard, Kalender, Scraper
 *   p-6 md:p-8   in Leads, Pipeline, Berichte, Einstellungen, Benutzer
 *
 * Acht Pixel Unterschied. Ein einzelner Bildschirm sieht damit nie falsch aus —
 * auffallen tut der Übergang: der Inhalt springt beim Wechsel der Ansicht.
 * Genau das ist mit "allign bitte alles noch besser" gemeint gewesen.
 *
 * Dazu kam die Maximalbreite: hier 1680, im Admin 1280. Zwei Anwendungen, die
 * nebeneinander laufen und zwischen denen oben rechts gewechselt wird, mit
 * 400 px Unterschied in der Textbreite.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const WURZEL = join(process.cwd(), 'src/app/components');

function alleDateien(pfad = WURZEL, gesammelt: string[] = []): string[] {
    for (const eintrag of readdirSync(pfad)) {
        const voll = join(pfad, eintrag);
        if (statSync(voll).isDirectory()) alleDateien(voll, gesammelt);
        else if (eintrag.endsWith('.tsx') && !eintrag.includes('.test.')) gesammelt.push(voll);
    }
    return gesammelt;
}

/**
 * Nur die Ansichten. Fenster (`Modal`), Auswahllisten und das Bausteinlager
 * setzen ihren Rand zu Recht selbst — ein Fenster ist keine Seite.
 */
const ANSICHTEN = alleDateien().filter((p) => {
    const n = p.split('/').pop() ?? '';
    if (n === 'ui-kit.tsx') return false;
    if (/Modal|Palette|Select|Login|Sidebar|Topbar/.test(n)) return false;
    return /View\.tsx$|^(Dashboard|Settings|UserManagement|PipelineSettings)\.tsx$/.test(n);
});

describe('Seitenrand', () => {
    it('kommt in jeder Ansicht aus der Konstante, nicht aus einer Klassenkette', () => {
        const eigenmaechtig: string[] = [];

        for (const datei of ANSICHTEN) {
            const quelle = readFileSync(datei, 'utf8');
            if (/\bSEITEN_RAND(?:_OHNE_BREITE)?\b/.test(quelle)) continue;

            // Maximalbreite ZUSAMMEN mit Rand = Seitenhülle. Eine Karte setzt
            // nie `max-w-` — sie füllt ihre Spalte.
            for (const m of quelle.matchAll(/className="([^"]*)"/g)) {
                const kette = m[1];
                if (/\b(?:p|px|py)-[4-9]\b/.test(kette) && /\bmax-w-(?:\[|\dxl|content|screen)/.test(kette)) {
                    eigenmaechtig.push(`${datei.replace(process.cwd() + '/', '')} → ${kette.slice(0, 70)}`);
                    break;
                }
            }

            const aussen = /return\s*\(\s*<div\s+className="([^"]*)"/.exec(quelle)?.[1] ?? '';
            if (/\bp-[6-9]\b/.test(aussen)) {
                eigenmaechtig.push(`${datei.replace(process.cwd() + '/', '')} → ${aussen.slice(0, 70)}`);
            }
        }

        expect(
            eigenmaechtig,
            'Diese Ansichten setzen ihren Seitenrand selbst. Nimm SEITEN_RAND aus ui-kit '
            + '— oder SEITEN_RAND_OHNE_BREITE, wenn die Ansicht ein Formular ist und '
            + 'bewusst schmaler bleibt.',
        ).toEqual([]);
    });

    it('hält den Wert aus dem Entwurf, eine Stufe kleiner', () => {
        const quelle = readFileSync(join(process.cwd(), 'src/app/components/ui-kit.tsx'), 'utf8');
        const rand = /export const SEITEN_RAND_OHNE_BREITE = '([^']*)'/.exec(quelle)?.[1] ?? '';
        expect(rand).toContain('px-4');
        expect(rand, 'eine Stufe unter den 32 px des Entwurfs').toContain('md:px-7');
        expect(rand, 'eine Stufe unter den 30 px des Entwurfs').toContain('md:pt-6');
        expect(rand, 'Fussraum, damit die letzte Zeile nicht am Rand klebt').toContain('pb-14');

        const voll = /export const SEITEN_RAND = cn\(SEITEN_RAND_OHNE_BREITE, '([^']*)'/.exec(quelle)?.[1] ?? '';
        expect(voll, 'Maximalbreite aus dem Entwurf').toContain('max-w-[1620px]');
    });
});
