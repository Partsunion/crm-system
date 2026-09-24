/**
 * Die Statusfarben — nachgerechnet, in beiden Modi.
 *
 * ─── Warum das gerechnet und nicht angeschaut wird ─────────────────────────
 *
 * Farbfehler sieht man nicht. In der Fassung vor dieser trugen „Broschüre"
 * und „Angebot" dieselbe Farbe (ΔE 0), und „Warm Halten" war grün wie
 * „Gewonnen" — ein geparkter Lead sah aus wie ein gewonnener. Aufgefallen ist
 * beides erst beim Ausrechnen.
 *
 * Der Test liest die Werte aus styles/theme.css, nicht aus einer Abschrift.
 * Wer dort etwas ändert, bekommt gesagt, welche Bedingung er bricht.
 *
 * ─── Was geprüft wird ──────────────────────────────────────────────────────
 *
 *  1. Die Schrift auf der getönten Fläche erreicht 4,5 — in BEIDEN Modi. Die
 *     Fläche entsteht erst im Browser aus Basisfarbe, Alpha und Untergrund;
 *     der Test mischt sie deshalb genauso.
 *  2. Der Vollton erreicht 3:1 zum Untergrund. Er trägt Balken und Punkte,
 *     also Flächen OHNE Text — dafür gilt der niedrigere Wert.
 *  3. Jede Stufe hat alle vier Werte, in beiden Modi.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const THEME = readFileSync('src/styles/theme.css', 'utf8');

/** Untergrund, auf dem ein Abzeichen sitzt (--bg-surface je Modus). */
const UNTERGRUND = { dunkel: '#0F1015', hell: '#FFFFFF' } as const;
type Modus = keyof typeof UNTERGRUND;

const STUFEN = ['neu', 'kontaktiert', 'qualifiziert', 'broschuere', 'angebot',
    'warm', 'verhandlung', 'gewonnen', 'verloren'] as const;

// ── Werte aus der CSS lesen ───────────────────────────────────────────────

/**
 * Der Block eines Modus.
 *
 * Dunkel steht im `:root`, hell im `[data-theme="light"]`-Block. Zwei Werte
 * mit demselben Namen: der zweite gewinnt im Browser, wenn der Modus passt.
 */
function block(modus: Modus): string {
    const start = THEME.indexOf('[data-theme="light"]');
    if (start < 0) throw new Error('Hellmodus-Block fehlt in theme.css');
    return modus === 'dunkel' ? THEME.slice(0, start) : THEME.slice(start);
}

/** Letzter Wert einer Variablen im Block — spätere überschreiben frühere. */
function wert(modus: Modus, name: string): string | undefined {
    const treffer = [...block(modus).matchAll(
        new RegExp(`--${name}:\\s*([^;]+);`, 'g'))];
    return treffer.length ? treffer[treffer.length - 1][1].trim() : undefined;
}

/**
 * Wert einer Stufe — im Hellmodus mit Rückfall auf den dunklen Block.
 *
 * Flächen und Rähmchen stehen NUR im dunklen Block: sie sind in beiden Modi
 * gleich (dieselbe Basisfarbe, dieselben Alphawerte), nur der Untergrund
 * darunter wechselt. Ein zweites Mal hinschreiben hiesse, sie an zwei Orten
 * pflegen zu müssen.
 */
function stufenWert(modus: Modus, stufe: string, teil: string): string {
    const v = wert(modus, `status-${stufe}-${teil}`) ?? wert('dunkel', `status-${stufe}-${teil}`);
    if (!v) throw new Error(`--status-${stufe}-${teil} fehlt (${modus})`);
    return v;
}

// ── Farbrechnung ──────────────────────────────────────────────────────────

const kanaele = (hex: string) => {
    const h = hex.replace('#', '');
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
const linear = (v: number) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };

function leuchtdichte(hex: string): number {
    const [r, g, b] = kanaele(hex).map(linear);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function kontrast(a: string, b: string): number {
    const [hoch, tief] = [leuchtdichte(a), leuchtdichte(b)].sort((x, y) => y - x);
    return (hoch + 0.05) / (tief + 0.05);
}

/**
 * `rgba(r, g, b, a)` über einen Untergrund legen.
 *
 * Genau das tut der Browser. Ohne diesen Schritt würde man die Basisfarbe
 * prüfen statt der Fläche, die man tatsächlich sieht — und käme bei
 * „Angebot" auf ein Ergebnis, das um Faktoren danebenliegt.
 */
function mischen(rgba: string, untergrund: string): string {
    const t = rgba.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,/\s]+([\d.]+))?\s*\)/);
    if (!t) throw new Error(`kein rgba: ${rgba}`);
    const [r, g, b] = [t[1], t[2], t[3]].map(Number);
    const a = t[4] === undefined ? 1 : Number(t[4]);
    const u = kanaele(untergrund);
    return '#' + [r, g, b].map((c, i) =>
        Math.round(c * a + u[i] * (1 - a)).toString(16).padStart(2, '0')).join('');
}

// ── Die Bedingungen ───────────────────────────────────────────────────────

/** Richtlinie für Text dieser Größe. */
const TEXT_MINDEST = 4.5;
/** Richtlinie für Flächen ohne Text (Balken, Punkte). */
const FLAECHE_MINDEST = 3;

describe.each(['dunkel', 'hell'] as const)('Statusfarben (%s)', (modus) => {
    it.each(STUFEN)('%s: die Schrift ist auf der getoenten Flaeche lesbar', (stufe) => {
        const flaeche = mischen(stufenWert(modus, stufe, 'bg'), UNTERGRUND[modus]);
        const schrift = stufenWert(modus, stufe, 'fg');
        const k = kontrast(schrift, flaeche);
        expect(k, `${stufe}: Schrift ${schrift} auf ${flaeche} nur ${k.toFixed(2)}`)
            .toBeGreaterThanOrEqual(TEXT_MINDEST);
    });

    it.each(STUFEN)('%s: der Vollton traegt als Balken', (stufe) => {
        // Balken und Punkte sind Flaechen ohne Text — 3:1 statt 4,5.
        const voll = stufenWert(modus, stufe, 'voll');
        const k = kontrast(voll, UNTERGRUND[modus]);
        expect(k, `${stufe}: Vollton ${voll} nur ${k.toFixed(2)} — Balken kaum sichtbar`)
            .toBeGreaterThanOrEqual(FLAECHE_MINDEST);
    });

    it.each(STUFEN)('%s: alle vier Werte sind da', (stufe) => {
        for (const teil of ['bg', 'fg', 'border', 'voll']) {
            expect(() => stufenWert(modus, stufe, teil)).not.toThrow();
        }
    });

    it.each(['hoch', 'mittel', 'niedrig'])('Prioritaet %s ist lesbar', (stufe) => {
        // Umrandung ohne Flaeche — die Schrift steht direkt auf der Karte.
        const schrift = wert(modus, `prio-${stufe}-fg`) ?? wert('dunkel', `prio-${stufe}-fg`)!;
        const k = kontrast(schrift, UNTERGRUND[modus]);
        expect(k, `Prioritaet ${stufe}: ${schrift} nur ${k.toFixed(2)}`)
            .toBeGreaterThanOrEqual(TEXT_MINDEST);
    });
});

describe('Der Farbtopf fuer selbst angelegte Status', () => {
    /**
     * Er liefert die Grundfarben, aus denen ein eigener Status seine drei
     * Werte mischt. Die Toenung ist dieselbe wie bei den festen Stufen
     * (24 %), die Schrift rueckt per color-mix davon weg.
     */
    const TOPF = (() => {
        const uiKit = readFileSync('src/app/components/ui-kit.tsx', 'utf8');
        const start = uiKit.indexOf('const LABEL_PALETTE');
        return [...uiKit.slice(start, uiKit.indexOf('];', start))
            .matchAll(/'(#[0-9A-Fa-f]{6})'/g)].map((t) => t[1].toUpperCase());
    })();

    it('enthaelt alle neun Volltoene der festen Stufen', () => {
        // Sonst faellt ein eigener Status farblich aus der Anwendung.
        for (const stufe of STUFEN) {
            expect(TOPF, `${stufe} fehlt im Topf`)
                .toContain(stufenWert('dunkel', stufe, 'voll').toUpperCase());
        }
    });

    it.each(['dunkel', 'hell'] as const)('%s: die gemischte Schrift ist lesbar', (modus) => {
        // Nachgebaut, was color-mix im Browser tut. Ohne diese Rechnung
        // waere der Mischanteil geraten — beim ersten Anlauf lagen drei der
        // zwoelf Farben bei 3,1 bis 3,6, weil die Grundfarbe SELBST als
        // Schrift auf ihrer eigenen Toenung stand.
        const richtung = modus === 'dunkel' ? '#FFFFFF' : '#000000';
        const anteil = modus === 'dunkel' ? 0.65 : 0.50;
        for (const basis of TOPF) {
            const u = kanaele(basis);
            const z = kanaele(richtung);
            const schrift = '#' + u.map((c, i) => Math.round(c * anteil + z[i] * (1 - anteil))
                .toString(16).padStart(2, '0')).join('');
            const flaeche = mischen(`rgba(${u.join(', ')}, 0.24)`, UNTERGRUND[modus]);
            const k = kontrast(schrift, flaeche);
            expect(k, `${basis} (${modus}): Schrift ${schrift} auf ${flaeche} nur ${k.toFixed(2)}`)
                .toBeGreaterThanOrEqual(TEXT_MINDEST);
        }
    });

    it('der Mischanteil steht je Modus in theme.css', () => {
        expect(wert('dunkel', 'ton-weg')).toBe('#FFFFFF');
        expect(wert('hell', 'ton-weg')).toBe('#000000');
        expect(wert('dunkel', 'ton-weg-anteil')).toBe('65%');
        expect(wert('hell', 'ton-weg-anteil')).toBe('50%');
    });
});

describe('Regeln der Vorgabe bleiben erhalten', () => {
    it('„Gewonnen" ist Tuerkis, nicht Gruen', () => {
        // Reines Gruen wird bei Gruenschwaeche zu Ockergelb und faellt mit
        // „Angebot" zusammen. Tuerkis behaelt einen Blauanteil.
        const [r, g, b] = kanaele(stufenWert('dunkel', 'gewonnen', 'voll'));
        expect(b, 'kein Blauanteil — dann ist es Gruen, nicht Tuerkis').toBeGreaterThan(r * 2);
        expect(g).toBeGreaterThan(b);
    });

    it('„Qualifiziert" haelt Abstand zum Akzentblau des Knopfes', () => {
        // Sonst sieht ein Status aus wie die Aktion „Neuer Lead".
        const akzent = wert('dunkel', 'accent-500')!;
        const stufe = stufenWert('dunkel', 'qualifiziert', 'voll');
        expect(stufe.toUpperCase()).not.toBe(akzent.toUpperCase());
    });

    it('„Warm Halten" ist entsaettigter als jede aktive Stufe', () => {
        // Die Stufe ruht und soll optisch hinter den aktiven liegen.
        const saettigung = (hex: string) => {
            const [r, g, b] = kanaele(hex);
            return Math.max(r, g, b) - Math.min(r, g, b);
        };
        const warm = saettigung(stufenWert('dunkel', 'warm', 'voll'));
        for (const stufe of ['kontaktiert', 'qualifiziert', 'angebot', 'verhandlung', 'gewonnen', 'verloren']) {
            expect(warm, `„Warm Halten" ist nicht ruhiger als ${stufe}`)
                .toBeLessThan(saettigung(stufenWert('dunkel', stufe, 'voll')));
        }
    });

    it('die Volltoene bleiben unveraendert, wie vorgegeben', () => {
        // Nachgerechnet: schon ab Faktor 1,10 faellt „Angebot"/„Verhandlung"
        // bei Gruenschwaeche von ΔE 11,0 auf 9,9 — die Balken waeren
        // kraeftiger, aber schlechter auseinanderzuhalten. Der blasse
        // Eindruck kam von den Abzeichen; dort ist die Toenung verdoppelt.
        const VORGABE: Record<string, string> = {
            neu: '#B0C0D1', kontaktiert: '#58CEF8', qualifiziert: '#5B6EE8',
            broschuere: '#DBBFFE', angebot: '#FAD03E', warm: '#77818C',
            verhandlung: '#EF852E', gewonnen: '#2FCDA3', verloren: '#CC3336',
        };
        for (const [stufe, farbe] of Object.entries(VORGABE)) {
            expect(stufenWert('dunkel', stufe, 'voll').toUpperCase()).toBe(farbe);
        }
    });

    it('„Warm Halten" bleibt bei der schwaechsten Toenung', () => {
        // Die Stufe ruht. Sie mitzuschaerfen haette die Regel aufgehoben,
        // die sie ueberhaupt begruendet.
        const alpha = (v: string) => Number(v.match(/,\s*([\d.]+)\s*\)/)![1]);
        const warm = alpha(stufenWert('dunkel', 'warm', 'bg'));
        for (const stufe of STUFEN.filter((s) => s !== 'warm')) {
            expect(warm, `„Warm Halten" ist nicht zurueckhaltender als ${stufe}`)
                .toBeLessThanOrEqual(alpha(stufenWert('dunkel', stufe, 'bg')));
        }
    });

    it('es gibt keine vollflaechigen Statuspillen mehr', () => {
        // Neun gesaettigte Flaechen untereinander ziehen die Aufmerksamkeit
        // von den Firmennamen weg.
        const uiKit = readFileSync('src/app/components/ui-kit.tsx', 'utf8');
        expect(uiKit, 'SolidPill ist zurueck').not.toMatch(/export function SolidPill/);
        expect(uiKit).toMatch(/backgroundColor: ton\.bg/);
    });

    it('die Prioritaet hat keine Flaeche', () => {
        // Sonst konkurriert das gelbe „Mittel" mit dem gelben „Angebot".
        const uiKit = readFileSync('src/app/components/ui-kit.tsx', 'utf8');
        const start = uiKit.indexOf('export function PriorityPill');
        expect(uiKit.slice(start, start + 500)).toContain("backgroundColor: 'transparent'");
    });
});
