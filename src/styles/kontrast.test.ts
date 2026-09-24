/**
 * Lesbarkeit der CRM-Palette — nachgerechnet, nicht geschätzt.
 *
 * Gegenstück zu `Admin-Dashboard/src/design-system/kontrast.test.ts`. Beide
 * Anwendungen fahren dieselbe Palette; dieser Test verhindert, dass sie beim
 * nächsten Entwurf auseinanderlaufen oder unter die Lesbarkeitsgrenze fallen.
 *
 * ─── Wogegen gemessen wird ─────────────────────────────────────────────────
 *
 * Nicht gegen die Grundfläche, sondern gegen den HELLSTEN Untergrund, auf dem
 * die Farbe wirklich vorkommt. Karten liegen als Verlauf von 4,5 % Weiss auf
 * der Fläche; oben ist der Untergrund am hellsten und heller Text hat es dort
 * am schwersten.
 *
 * Grenze: 4,5 für gewöhnlichen Text, 3,0 für Symbole und Umrisse.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

type Rgb = readonly [number, number, number];

const THEME = readFileSync(join(process.cwd(), 'src/styles/theme.css'), 'utf8');

/**
 * Die Datei enthält ZWEI Sätze. Für den Hellmodus muss der zweite gelesen
 * werden — sonst prüft man den dunklen doppelt und der helle kann still
 * unlesbar sein. Getrennt wird am Selektor des Hellblocks.
 */
/**
 * Trennstelle am SELEKTOR, nicht an der Zeichenfolge — sonst trennt ein
 * Kommentar, der denselben Text enthält, an der falschen Stelle. Ausführlich
 * in Admin-Dashboard/src/design-system/kontrast.test.ts.
 */
const HELL_AB = /^\[data-theme="light"\]/m.exec(THEME)?.index ?? -1;
const DUNKEL_TEIL = HELL_AB > 0 ? THEME.slice(0, HELL_AB) : THEME;
const HELL_TEIL = HELL_AB > 0 ? THEME.slice(HELL_AB) : '';

/** Liest einen HEX-Token aus dem gewünschten Satz. */
function token(name: string, satz: 'dunkel' | 'hell' = 'dunkel'): Rgb {
    const quelle = satz === 'hell' ? HELL_TEIL : DUNKEL_TEIL;
    const m = new RegExp(`--${name}:\\s*#([0-9A-Fa-f]{6})`).exec(quelle);
    if (!m) throw new Error(`Token --${name} nicht im ${satz}en Satz gefunden`);
    const h = m[1];
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as unknown as Rgb;
}

/** Relative Leuchtdichte nach WCAG 2.1. */
function leuchtdichte([r, g, b]: Rgb): number {
    const f = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function kontrast(a: Rgb, b: Rgb): number {
    const la = leuchtdichte(a);
    const lb = leuchtdichte(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Halbdurchsichtige Farbe über einem Untergrund — so rechnet der Browser. */
function ueber(vorne: Rgb, hinten: Rgb, deckung: number): Rgb {
    return [0, 1, 2].map((i) => vorne[i] * deckung + hinten[i] * (1 - deckung)) as unknown as Rgb;
}

const WEISS: Rgb = [1, 1, 1];
/** Oberer Rand des Kartenverlaufs — der hellste Untergrund im CRM. */
const KARTE = token('karte-von');

describe('Textstufen auf dem Kartengrund', () => {
    it.each([
        ['text-primary'],
        ['text-secondary'],
        ['text-tertiary'],
        ['text-muted'],
    ])('%s erreicht 4,5:1', (name) => {
        expect(kontrast(token(name), KARTE)).toBeGreaterThanOrEqual(4.5);
    });

    /**
     * text-faint ist KEINE Textstufe, sondern die Stufe für Symbole und
     * Linien. Dafür gilt 3,0. Auf 4,5 angehoben läge sie neben text-muted und
     * beide sähen gleich aus — im Admin nachgemessen: 1,08 Abstand.
     */
    it('text-faint reicht fuer Symbole (3,0), aber nicht fuer Text', () => {
        const k = kontrast(token('text-faint'), KARTE);
        expect(k).toBeGreaterThanOrEqual(3.0);
        expect(k).toBeLessThan(4.5);
    });
});

describe('Zustands- und Akzentfarben', () => {
    it.each([
        ['success'],
        ['warning'],
        ['danger'],
        ['info'],
        ['accent-400'],
        ['accent-500'],
    ])('%s ist auf der Karte lesbar', (name) => {
        expect(kontrast(token(name), KARTE)).toBeGreaterThanOrEqual(4.5);
    });
});

describe.each(['dunkel', 'hell'] as const)('getönte Hinweise im %sen Modus', (theme) => {
    it.each(['success', 'warning', 'danger', 'info', 'accent-500'])('%s bleibt auf eigener Tönung lesbar', (name) => {
        const foreground = token(name, theme);
        const background = ueber(foreground, token('bg-surface', theme), 0.12);
        expect(kontrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
    });
});

describe('gefuellte Akzentflaechen', () => {
    /**
     * Der Grund, warum gefüllte Knöpfe accent-600 nehmen und nicht accent-500:
     * Weiss auf accent-500 reicht nicht. Dieser Test hält das fest — sonst
     * greift beim nächsten Knopf wieder jemand zur "Markenfarbe".
     */
    it('Weiss auf accent-500 ist NICHT genug — deshalb wird es nicht benutzt', () => {
        expect(kontrast(WEISS, token('accent-500'))).toBeLessThan(4.5);
    });

    it.each([['accent-600'], ['accent-700']])('Weiss auf %s reicht', (name) => {
        expect(kontrast(WEISS, token(name))).toBeGreaterThanOrEqual(4.5);
    });
});

describe('Stufen bleiben unterscheidbar', () => {
    it('jede Textstufe ist von der naechsten abgesetzt', () => {
        const stufen = ['text-primary', 'text-secondary', 'text-tertiary', 'text-muted', 'text-faint'];
        const werte = stufen.map((n) => leuchtdichte(token(n)));
        for (let i = 0; i < werte.length - 1; i++) {
            expect(
                werte[i] / werte[i + 1],
                `${stufen[i]} und ${stufen[i + 1]} liegen zu dicht beieinander`,
            ).toBeGreaterThan(1.15);
        }
    });
});

describe('Hellmodus', () => {
    /**
     * Der Entwurf ist nur dunkel gezeichnet; der Hellsatz ist eine Übertragung.
     * Ohne diese Prüfung wäre er das, was ein Hellmodus meistens ist: auf dem
     * Papier vorhanden und in Wirklichkeit nicht zu lesen.
     *
     * Im Hellen ist die Auflage SCHWARZ (--overlay: 0 0 0), nicht weiss —
     * darauf beruht der ganze Modus.
     */
    const GRUND_HELL = token('bg-canvas', 'hell');
    const SCHWARZ: Rgb = [0, 0, 0];
    /**
     * Die helle Karte ist WEISS, keine Tönung des Grundes.
     *
     * Hier stand `ueber(SCHWARZ, GRUND_HELL, 0.045)` — die Spiegelung der
     * dunklen Karte. Solange die Karte über --overlay gebaut war, stimmte das.
     * Seit sie eigene Token hat (--karte-von/--karte-bis), ist sie im Hellen
     * reines Weiss auf getöntem Grund, und dieser Test hätte gegen einen
     * Untergrund gemessen, den es nicht mehr gibt.
     *
     * Weiss ist der HELLSTE mögliche Untergrund und damit der schwerste Fall
     * für helle Schrift — hier zu messen ist also nicht nur richtig, sondern
     * auch die strengste Wahl.
     */
    const KARTE_HELL: Rgb = [1, 1, 1];

    it.each([['text-primary'], ['text-secondary'], ['text-tertiary'], ['text-muted']])(
        '%s erreicht 4,5:1',
        (name) => {
            expect(kontrast(token(name, 'hell'), KARTE_HELL)).toBeGreaterThanOrEqual(4.5);
        },
    );

    it('text-faint bleibt die Symbolstufe (3,0)', () => {
        const k = kontrast(token('text-faint', 'hell'), KARTE_HELL);
        expect(k).toBeGreaterThanOrEqual(3.0);
        expect(k).toBeLessThan(4.5);
    });

    it.each([['success'], ['warning'], ['danger'], ['info'], ['accent-500']])(
        '%s ist auf der Karte lesbar',
        (name) => {
            expect(kontrast(token(name, 'hell'), KARTE_HELL)).toBeGreaterThanOrEqual(4.5);
        },
    );

    it.each([['accent-500'], ['accent-600'], ['accent-700']])(
        'Weiss auf %s reicht — gefüllte Knöpfe bleiben lesbar',
        (name) => {
            expect(kontrast(WEISS, token(name, 'hell'))).toBeGreaterThanOrEqual(4.5);
        },
    );

    it('die Akzentrampe wird DUNKLER, nicht heller', () => {
        // #5C8DFF auf Weiss ergibt 2,3 — unlesbar. Eine gespiegelte Rampe wäre
        // der naheliegende Fehler; dieser Test hält die Richtung fest.
        expect(leuchtdichte(token('accent-500', 'hell')))
            .toBeLessThan(leuchtdichte(token('accent-500')));
    });

    it('jede Textstufe ist von der naechsten abgesetzt', () => {
        const stufen = ['text-primary', 'text-secondary', 'text-tertiary', 'text-muted', 'text-faint'];
        const werte = stufen.map((n) => leuchtdichte(token(n, 'hell')));
        for (let i = 0; i < werte.length - 1; i++) {
            expect(
                werte[i + 1] / werte[i],
                `${stufen[i]} und ${stufen[i + 1]} liegen zu dicht beieinander`,
            ).toBeGreaterThan(1.15);
        }
    });

    it('die Auflage kippt von Weiss auf Schwarz', () => {
        expect(DUNKEL_TEIL).toMatch(/--overlay:\s*255 255 255/);
        expect(HELL_TEIL).toMatch(/--overlay:\s*0 0 0/);
    });

    it('gleiche Werte wie im Admin-Dashboard', () => {
        // Beide Anwendungen sollen auch im Hellen zusammen aussehen.
        const erwartet: Record<string, string> = {
            'text-primary': '#2E3342',
            'accent-500': '#194BF0',
            'accent-600': '#0D3CD3',
        };
        for (const [name, hex] of Object.entries(erwartet)) {
            const m = new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`).exec(HELL_TEIL);
            expect(m?.[1].toUpperCase(), `${name} weicht ab`).toBe(hex);
        }
    });
});

const QUELLEN_FUER_TON = [join(process.cwd(), 'src/app/components/ui-kit.tsx')];

describe('Statusfelder — Schrift auf der Farbfläche', () => {
    /**
     * Die Lücke, die mich das gekostet hat.
     *
     * Die Prüfungen oben messen jede Statusfarbe gegen die KARTE. Auf der Karte
     * liegt sie aber nur als Punkt, Balken oder Rand. In einem Statusfeld
     * ("Live", "Gefährdet") liegt sie auf einer FLÄCHE — und die Fläche war
     * vorher eine Tönung derselben Farbe. Das ist ein anderer, deutlich
     * schlechterer Untergrund, und er wurde nirgends gemessen.
     *
     * Ergebnis: im Hellmodus lag die Schrift bei 4,1 statt 4,5. Der Test war
     * grün, die Anwendung unlesbar. Genau die Sorte Lücke, die ein Test
     * gefährlicher macht als gar keinen — er behauptet eine Aussage, die er
     * nicht trifft.
     *
     * Deshalb wird hier der ECHTE Untergrund gemessen: die volle Statusfarbe,
     * mit der Schrift, die --auf-ton dort vorgibt.
     */
    const AUF_TON_DUNKEL: Rgb = [0x0F / 255, 0x10 / 255, 0x15 / 255];
    const AUF_TON_HELL: Rgb = [1, 1, 1];

    it.each([['success'], ['warning'], ['danger'], ['info'], ['accent-500']])(
        '%s traegt im Dunkeln die dunkle Schrift',
        (name) => {
            expect(kontrast(AUF_TON_DUNKEL, token(name))).toBeGreaterThanOrEqual(4.5);
        },
    );

    it.each([['success'], ['warning'], ['danger'], ['info'], ['accent-500']])(
        '%s traegt im Hellen die weisse Schrift',
        (name) => {
            expect(kontrast(AUF_TON_HELL, token(name, 'hell'))).toBeGreaterThanOrEqual(4.5);
        },
    );

    it('das Token kippt mit dem Modus', () => {
        // Umgekehrt waere es falsch herum: im Dunkeln sind die Statusfarben
        // hell, da braucht es dunkle Schrift — und im Hellen andersherum.
        expect(DUNKEL_TEIL).toMatch(/--auf-ton:\s*(?:230 17% 7%|#0F1015)/i);
        expect(HELL_TEIL).toMatch(/--auf-ton:\s*(?:0 0% 100%|#FFFFFF)/i);
    });

    it('keine Statusflaeche ist mehr eine Toenung ihrer eigenen Farbe', () => {
        /**
         * Der Rueckfall, den ich verhindern will: jemand findet die volle
         * Flaeche zu laut und dreht sie auf `bg-success/10` zurueck. Das sieht
         * im Dunkeln gut aus und ist im Hellen unlesbar — man merkt es nicht,
         * wenn man nur im Dunkeln arbeitet.
         */
        /* Kommentare ZUERST weg. In genau diesen Dateien stehen die alten
           Werte als Negativbeispiel im Text ("hier stand bg-success/10") —
           ohne das Entfernen meldet der Waechter seine eigene Begruendung.
           Derselbe Fehler ist mir beim Hellmodus-Waechter schon unterlaufen. */
        const treffer = QUELLEN_FUER_TON
            .filter((p) => {
                const ohneKommentar = readFileSync(p, 'utf8')
                    .replace(/\/\*[\s\S]*?\*\//g, '')
                    .replace(/^\s*\/\/.*$/gm, '');
                /* Nur RUHENDE Flaechen. `hover:bg-danger/15` am Symbolknopf
                   bleibt erlaubt: dort liegt ein Symbol darauf, kein Text, und
                   fuer Symbole gilt 3,0 statt 4,5 — nachgemessen 4,2, also
                   ausreichend. Ein Waechter, der auch das meldet, wuerde zum
                   Abschalten erziehen statt zum Nachrechnen. */
                return /(?<!hover:)(?<!focus:)(?<!group-hover:)bg-(?:status-)?(?:success|warning|danger|info|accent-500)\/\d/
                    .test(ohneKommentar);
            })
            .map((p) => p.replace(process.cwd() + '/', ''));
        expect(
            treffer,
            'Eine Toenung der eigenen Farbe traegt die Schrift nicht. Nimm die volle '
            + 'Farbe mit text-auf-ton.',
        ).toEqual([]);
    });
});

/** Für --karte-von, das im Hellsatz auch als hsl() stehen kann. */
function hslZuRgb(h: number, s: number, l: number): Rgb {
    const hh = h / 360, ss = s / 100, ll = l / 100;
    const f = (n: number) => {
        const k = (n + hh * 12) % 12;
        const a = ss * Math.min(ll, 1 - ll);
        return ll - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    };
    return [f(0), f(8), f(4)] as unknown as Rgb;
}

describe('Karten heben sich vom Grund ab — in BEIDEN Modi', () => {
    /**
     * Die Regel, an der der helle Modus vorher gescheitert ist.
     *
     * Eine Karte wird als Karte gelesen, weil sie HELLER ist als ihre
     * Umgebung — im Dunkeln wie im Hellen. Das ist keine Geschmacksfrage,
     * sondern wie Licht funktioniert: was näher an der Quelle liegt, ist
     * heller.
     *
     * Vorher kam die Kartenfläche in beiden Sätzen aus --overlay. Im Dunkeln
     * ergab das 4,5 % Weiss auf Dunkel (heller — richtig), im Hellen 4,5 %
     * Schwarz auf fast-Weiss (DUNKLER — falsch). Die Karte sah aus wie eine
     * graue Folie, und der ganze Modus wirkte flach. Genau das prüft dieser
     * Test, und zwar an der Zahl statt am Eindruck.
     */
    function karteGegenGrund(satz: 'dunkel' | 'hell'): { karte: number; grund: number } {
        const teil = satz === 'hell' ? HELL_TEIL : DUNKEL_TEIL;
        const grund = token('bg-canvas', satz);

        // --karte-von ist im Dunkeln eine halbdurchsichtige Weissauflage, im
        // Hellen eine deckende Farbe. Beide Formen müssen gelesen werden.
        const roh = new RegExp(String.raw`--karte-von:\s*([^;]+);`).exec(teil)?.[1].trim() ?? '';

        let karte: Rgb;
        const durchsichtig = /rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*\/\s*([\d.]+)\s*\)/.exec(roh);
        const alsHex = /^#([0-9A-Fa-f]{6})$/.exec(roh);
        const alsHsl = /hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*\)/.exec(roh);

        if (durchsichtig) {
            const vorne: Rgb = [
                Number(durchsichtig[1]) / 255,
                Number(durchsichtig[2]) / 255,
                Number(durchsichtig[3]) / 255,
            ];
            karte = ueber(vorne, grund, Number(durchsichtig[4]));
        } else if (alsHex) {
            karte = [0, 2, 4].map((i) => parseInt(alsHex[1].slice(i, i + 2), 16) / 255) as unknown as Rgb;
        } else if (alsHsl) {
            karte = hslZuRgb(Number(alsHsl[1]), Number(alsHsl[2]), Number(alsHsl[3]));
        } else {
            throw new Error(`--karte-von im ${satz}en Satz nicht lesbar: "${roh}"`);
        }

        return { karte: leuchtdichte(karte), grund: leuchtdichte(grund) };
    }

    it.each([['dunkel'], ['hell']] as const)('im %sen Satz ist die Karte heller als der Grund', (satz) => {
        const { karte, grund } = karteGegenGrund(satz);
        expect(karte, 'eine Karte, die dunkler ist als ihr Grund, wirkt wie ein Fleck').toBeGreaterThan(grund);
    });

    it('der helle Grund ist NICHT fast-weiss', () => {
        /**
         * Auf Weiss ist Weiss keine Fläche. Wenn der Grund zu hell wird, kann
         * die Karte sich nicht mehr abheben, egal wie der Schatten aussieht —
         * vorher stand der Grund auf 98 % und die Karte hatte keine Chance.
         */
        expect(leuchtdichte(token('bg-canvas', 'hell'))).toBeLessThan(0.90);
    });

    it('Karten erhalten in beiden Modi eigene Schatten', () => {
        expect(DUNKEL_TEIL).toMatch(/--karte-schatten:\s*var\(--shadow-card\)/);
        expect(DUNKEL_TEIL).toMatch(/--shadow-card:\s*[^;]*\d/);
        expect(HELL_TEIL).toMatch(/--karte-schatten:\s*[^;]*\d/);
    });
});

/** Sättigung im HSL-Sinn — 0 ist Grau, 1 ist die reine Farbe. */
function saettigung([r, g, b]: Rgb): number {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max === min) return 0;
    const l = (max + min) / 2;
    return (max - min) / (l > 0.5 ? 2 - max - min : max + min);
}

describe('Helle Akzentrampe traegt als Text', () => {
    /**
     * Der Fund, der mich das gekostet hat: `text-accent-400` stand SIEBZIG Mal
     * in beiden Anwendungen, und im Hellmodus lag diese Stufe bei 3,6 — also
     * seit dem ersten Tag unlesbar. Mein Kontrasttest hat accent-400 nur im
     * Begrüssungsbereich geprüft, und dort nur im dunklen Satz.
     *
     * Im Hellen ist die Karte WEISS. Jede Stufe, die als Schrift vorkommen
     * kann, muss also gegen Weiss tragen — und weisser geht es nicht, das ist
     * der schwerste Fall.
     */
    it.each([['accent-400'], ['accent-500'], ['accent-600'], ['accent-700']])(
        '%s ist im Hellen auf Weiss lesbar',
        (name) => {
            expect(kontrast(token(name, 'hell'), [1, 1, 1] as const)).toBeGreaterThanOrEqual(4.5);
        },
    );

    it('die hellen Farben sind KRAEFTIG, nicht bloss dunkel', () => {
        /**
         * Die Rückmeldung war "ich will keine blassen Farben". Vorher standen
         * hier success #1C7850 (62 % Sättigung) und warning #975D0C (Braun) —
         * ich hatte sie abgedunkelt, damit sie als Schrift tragen, und dabei
         * die Sättigung mitgenommen.
         *
         * Die Lesbarkeitsschranke begrenzt aber die LEUCHTDICHTE, nicht die
         * Sättigung. Man darf den Farbton voll aufdrehen und muss nur die
         * Helligkeit passend wählen. Dieser Test hält fest, dass niemand aus
         * Vorsicht wieder Sättigung wegnimmt, wo keine weggenommen werden muss.
         */
        for (const name of ['success', 'warning', 'danger', 'info', 'accent-500']) {
            expect(saettigung(token(name, 'hell')), `${name} ist zu matt`).toBeGreaterThanOrEqual(0.7);
        }
    });
});

/** Alle Bausteine — nicht nur die zwei Dateien der Pruefung darueber. */
function alleTsx(pfad: string, gesammelt: string[] = []): string[] {
    for (const eintrag of readdirSync(pfad)) {
        const voll = join(pfad, eintrag);
        if (statSync(voll).isDirectory()) alleTsx(voll, gesammelt);
        else if (eintrag.endsWith('.tsx') && !eintrag.includes('.test.')) gesammelt.push(voll);
    }
    return gesammelt;
}

const ALLE_QUELLEN = alleTsx(join(process.cwd(), 'src/app'));

describe('feste Tailwind-Farben tragen auch im Hellen', () => {
    /**
     * Die Luecke, durch die die Kalender-Termine gefallen sind.
     *
     * Die Pruefung eine Ebene hoeher ("keine Statusflaeche ist mehr eine
     * Toenung ihrer eigenen Farbe") schaut nur auf UNSERE Token. Der Kalender
     * benutzt aber feste Tailwind-Farben, damit sich die Terminarten
     * unterscheiden — violett, himmelblau, smaragd. Fuer die galt dieselbe
     * Regel und niemand hat sie geprueft:
     *
     *     bg-emerald-500/15 text-emerald-300
     *
     * Im Dunkeln ist emerald-300 hell und liegt gut auf der Toenung. Im Hellen
     * liegt eine BLASSE Schrift auf einer BLASSEN Toenung derselben Farbe —
     * nachgemessen 1,32 statt der geforderten 4,5. Die Termine waren im
     * Hellmodus praktisch unsichtbar.
     *
     * Die 300er-Toene sind Festwerte und kippen nicht mit dem Modus. Deshalb
     * braucht jede solche Stelle ein `hell:`-Gegenstueck; das prueft dieser
     * Test.
     */
    const HELLE_STUFEN = /\btext-([a-z]+)-([34]00)\b/g;

    it('jede helle Schriftfarbe auf eigener Toenung hat ein hell:-Gegenstueck', () => {
        const fehlt: string[] = [];

        for (const datei of ALLE_QUELLEN) {
            const quelle = readFileSync(datei, 'utf8')
                .replace(/\/\*[\s\S]*?\*\//g, '')
                .replace(/^\s*\/\/.*$/gm, '');

            // Klassenketten einzeln ansehen: nur wo die Toenung DERSELBEN Farbe
            // als Flaeche dient, ist die helle Schrift ein Problem.
            for (const m of quelle.matchAll(/class(?:Name)?=["'`]([^"'`]*)["'`]|['"`]([^'"`]*bg-[a-z]+-\d00\/\d+[^'"`]*)['"`]/g)) {
                const kette = m[1] ?? m[2] ?? '';
                for (const t of kette.matchAll(HELLE_STUFEN)) {
                    const farbe = t[1];
                    if (!new RegExp(`bg-${farbe}-\\d00/`).test(kette)) continue;
                    if (new RegExp(`hell:text-${farbe}-`).test(kette)) continue;
                    fehlt.push(`${datei.replace(process.cwd() + '/', '')} → ${farbe}-${t[2]}`);
                }
            }
        }

        expect(
            [...new Set(fehlt)],
            'Diese Stellen sind im Hellmodus unlesbar: helle Schrift auf einer Toenung '
            + 'derselben Farbe. Ergaenze `hell:text-<farbe>-700` (bei amber/orange 800).',
        ).toEqual([]);
    });
});
