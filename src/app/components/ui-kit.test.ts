/**
 * Statusfarben aus Sicht der Bauteile.
 *
 * Die WERTE prüft src/test/statusFarben.test.ts gegen theme.css. Hier geht es
 * um die Verdrahtung: dass die neun bekannten Stufen ihre Farben aus den
 * Variablen holen (nur die kippen mit dem Modus), und dass ein in den
 * Einstellungen selbst angelegter Status nicht durchfällt.
 *
 * ANLASS: Vorher standen feste HEX-Werte für beide Modi im Bauteil. Der
 * Hellmodus war damit entweder unlesbar oder sah aus wie der Dunkelmodus mit
 * Schleier. Ein Bauteil, das seine Farbe selbst kennt, kann keinen Modus
 * haben.
 */
import { describe, expect, it } from 'vitest';

import { prioTon, statusColor, statusTon } from './ui-kit';

const STUFEN = ['Neu', 'Kontaktiert', 'Qualifiziert', 'Broschüre', 'Angebot',
    'Warm Halten', 'Verhandlung', 'Gewonnen', 'Verloren'];

describe('Bekannte Stufen holen ihre Farbe aus den Variablen', () => {
    it.each(STUFEN)('%s', (name) => {
        const ton = statusTon(name);
        for (const [teil, v] of Object.entries(ton)) {
            expect(v, `${name}.${teil} ist ein fester Wert statt einer Variablen — `
                + 'dann kippt er nicht mit dem Hell-/Dunkelmodus').toMatch(/^var\(--status-/);
        }
        expect(statusColor(name)).toMatch(/^var\(--status-.+-voll\)$/);
    });

    it('jede Stufe hat ihren EIGENEN Variablenstamm', () => {
        // Zwei Stufen auf denselben Stamm zu legen, waere der Fehler von
        // vorher in neuer Form: „Broschüre" und „Angebot" trugen dieselbe Farbe.
        const staemme = STUFEN.map((n) => statusTon(n).bg);
        expect(new Set(staemme).size).toBe(STUFEN.length);
    });

    it.each(['Hoch', 'Mittel', 'Niedrig'])('Prioritaet %s ebenso', (name) => {
        expect(prioTon(name).fg).toMatch(/^var\(--prio-/);
        expect(prioTon(name).border).toMatch(/^var\(--prio-/);
    });
});

describe('Selbst angelegte Status fallen nicht durch', () => {
    it('bekommen eine gemischte Flaeche statt einer Variablen', () => {
        const ton = statusTon('Rueckruf vereinbart');
        expect(ton.bg).toMatch(/^rgba\(/);
        expect(ton.border).toMatch(/^rgba\(/);
    });

    it('die Schrift ruecke von der eigenen Flaeche weg, statt sie zu sein', () => {
        // Die Grundfarbe auf ihrer eigenen 24-%-Toenung kommt nicht ueber
        // 4,5 — bei drei der zwoelf Farben lag sie bei 3,1 bis 3,6. Der
        // Mischanteil kippt mit dem Modus: im Dunkeln zum Weiss, im Hellen
        // zum Schwarz.
        const fg = statusTon('Rueckruf vereinbart').fg;
        expect(fg).toContain('color-mix(');
        expect(fg).toContain('var(--ton-weg-anteil)');
        expect(fg).toContain('var(--ton-weg)');
    });

    it('derselbe Name ergibt immer dieselbe Farbe', () => {
        // Sonst springt die Farbe eines Status bei jedem Neuladen.
        expect(statusTon('Wiedervorlage').fg).toBe(statusTon('Wiedervorlage').fg);
    });

    it('verschiedene Namen verteilen sich ueber den ganzen Farbtopf', () => {
        const namen = Array.from({ length: 200 }, (_, i) => `Eigener Status ${i}`);
        expect(new Set(namen.map((n) => statusTon(n).fg)).size).toBeGreaterThan(8);
    });

    it('dieselbe Toenung wie die festen Stufen (24 %)', () => {
        // Sonst sieht ein eigener Status neben den festen falsch aus.
        expect(statusTon('Irgendwas').bg).toMatch(/0\.24\)$/);
    });

    it('ohne Status gibt es einen ruhigen Ton, keinen Absturz', () => {
        expect(() => statusTon(undefined)).not.toThrow();
        expect(statusTon(undefined).fg).toContain('color-mix(');
        expect(statusColor(undefined)).toMatch(/^#/);
    });
});
