/**
 * Suchfeld und Seitenleiste müssen dieselben Ansichten kennen.
 *
 * ─── Warum das auseinanderläuft ────────────────────────────────────────────
 *
 * Beide Listen sind von Hand gepflegt und stehen in verschiedenen Dateien. Wer
 * eine Ansicht anlegt, trägt sie in die Seitenleiste ein — dort sieht man
 * sofort, ob sie fehlt. Ins Suchfeld trägt sie niemand ein, weil dessen Fehlen
 * nur auffällt, wenn jemand genau danach sucht und aufgibt.
 *
 * Genau das war der Fall: der Kalender stand in der Seitenleiste und fehlte im
 * Suchfeld. Eine Suche, die eine vorhandene Seite verschweigt, ist schlimmer
 * als gar keine — sie beantwortet die Frage falsch statt sie offen zu lassen.
 *
 * Die Gegenrichtung prüft das Admin-Dashboard mit demselben Gedanken: dort
 * standen Werkzeuge im Suchfeld, die im Betrieb niemand anklicken soll.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const PALETTE = readFileSync(
    join(process.cwd(), 'src/app/components/CommandPalette.tsx'), 'utf8',
);
const SEITENLEISTE = readFileSync(
    join(process.cwd(), 'src/app/components/layout/Sidebar.tsx'), 'utf8',
);

/** Alle `view: 'x'` einer Datei. */
function ansichten(quelle: string): Set<string> {
    const ohneKommentar = quelle
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
    return new Set([...ohneKommentar.matchAll(/\bview:\s*'([a-zA-Z]+)'/g)].map((m) => m[1]));
}

describe('Suchfeld und Seitenleiste', () => {
    it('kennen dieselben Ansichten', () => {
        const imSuchfeld = ansichten(PALETTE);
        const inDerLeiste = ansichten(SEITENLEISTE);

        const fehltImSuchfeld = [...inDerLeiste].filter((v) => !imSuchfeld.has(v)).sort();
        const nurImSuchfeld = [...imSuchfeld].filter((v) => !inDerLeiste.has(v)).sort();

        expect(
            fehltImSuchfeld,
            'Diese Ansichten stehen in der Seitenleiste, aber nicht im Suchfeld — '
            + 'wer dort danach sucht, findet nichts und hält sie für nicht vorhanden.',
        ).toEqual([]);

        expect(
            nurImSuchfeld,
            'Diese Ansichten bietet das Suchfeld an, obwohl die Seitenleiste sie nicht '
            + 'kennt. Entweder gehören sie in die Leiste — oder sie gehören nicht ins '
            + 'Suchfeld.',
        ).toEqual([]);
    });

    it('der Kalender ist auffindbar', () => {
        /**
         * Der konkrete Fall, der zu diesem Test geführt hat. Steht hier
         * zusätzlich zur allgemeinen Regel, damit beim nächsten Umbau die
         * Absicht erkennbar bleibt und nicht nur ein leeres Array.
         */
        expect(ansichten(PALETTE).has('kalender')).toBe(true);
        expect(PALETTE, 'auch über "Termine" zu finden').toMatch(/termine/i);
    });
});
