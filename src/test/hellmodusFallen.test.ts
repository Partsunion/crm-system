/**
 * Fallen, die einen Hellmodus still unlesbar machen.
 *
 * Anlass: nach dem Umstellen sah der Hellmodus im Admin-Dashboard gut aus — bis
 * auf den aktiven Eintrag in der Seitenleiste, der fast unsichtbar war.
 * `text-white` auf einem DURCHSCHEINENDEN Akzentverlauf: im Dunkeln richtig, im
 * Hellen weg. Das CRM hat denselben Aufbau, also dieselbe Prüfung.
 *
 * Der Fehler erzeugt keine Warnung und keinen roten Test. Man sieht ihn nur,
 * wenn man umschaltet und genau hinsieht — also selten. Deshalb liest dieser
 * Test den Quelltext.
 *
 * Er prüft NICHT die Optik, sondern eine Regel: deckendes Weiss ist nur auf
 * einer DECKENDEN farbigen Fläche erlaubt. Wo an der Fläche eine Deckungsangabe
 * steht (bg-…, from-…, via-…, to-… mit Schrägstrich und Zahl) oder wo sie über
 * die Auflage läuft, gehört eine Textstufe hin.
 *
 * (Vorsicht beim Ändern dieses Kommentars: die Klassenschreibweise mit Stern
 * und Schrägstrich enthält die Zeichenfolge, die einen Blockkommentar beendet.
 * Sie hat den Test beim ersten Versuch unlesbar gemacht.)
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

describe('deckendes Weiss nur auf deckendem Grund', () => {
    it('kein text-white neben einer durchscheinenden Fläche', () => {
        const funde: string[] = [];

        for (const pfad of QUELLEN) {
            const text = readFileSync(pfad, 'utf8');
            for (const [i, zeile] of text.split('\n').entries()) {
                if (!zeile.includes('text-white')) continue;

                /* Durchscheinend heisst: eine Deckungsangabe an der RUHENDEN
                   Fläche. bg-accent-600 ist deckend und in Ordnung.

                   Die Vorschau davor darf kein Zustandspräfix sein: in
                   `bg-destructive text-white hover:bg-destructive/90` ist die
                   ruhende Fläche deckend und nur das Überfahren getönt — das
                   waren die beiden Fehlalarme beim ersten Versuch. Deshalb
                   `(?<![\w:-])`: kein Buchstabe, kein Bindestrich und
                   insbesondere kein Doppelpunkt davor. */
                const getoent = /(?<![\w:-])(?:bg|from|via|to)-[a-z0-9-]+\/(?:\[0\.|\d)/;
                const durchscheinend = getoent.test(zeile)
                    || /(?<![\w:-])(?:bg|from|via|to)-overlay/.test(zeile)
                    || /to-transparent/.test(zeile);
                if (durchscheinend) {
                    funde.push(`${pfad.replace(process.cwd() + '/', '')}:${i + 1}`);
                }
            }
        }

        expect(
            funde,
            'text-white auf durchscheinender Fläche — im Hellmodus unsichtbar. '
            + 'Nimm eine Textstufe (text-text-primary) oder den Akzent.',
        ).toEqual([]);
    });

    it('kein hover:text-white — der Zustand kippt mit dem Modus', () => {
        const funde = QUELLEN.filter((p) => readFileSync(p, 'utf8').includes('hover:text-white'))
            .map((p) => p.replace(process.cwd() + '/', ''));
        expect(funde, 'nimm hover:text-text-primary').toEqual([]);
    });
});

describe('keine harten Auflagen mehr', () => {
    /**
     * Durchscheinendes Weiss als Klasse und rgba(255,255,255,…) in CSS lassen
     * sich im Hellmodus nicht kippen. Beides muss über --overlay laufen — das
     * war der ganze Trick, mit dem der Hellmodus überhaupt möglich wurde.
     */
    it('keine weisse Auflage in Klassen — beide Schreibweisen', () => {
        /* ZWEI Formen, und die zweite hatte ich beim ersten Durchgang übersehen:
           `white/[0.07]` in Klammern UND `white/10` aus der Skala. Die
           Skalenform stand am Avatar und am Rand des Wechselknopfs — im
           Hellmodus jeweils weisser Rand auf hellem Grund. */
        const funde = QUELLEN
            .filter((p) => /\bwhite\/(?:\[0\.|\d)/.test(readFileSync(p, 'utf8')))
            .map((p) => p.replace(process.cwd() + '/', ''));
        expect(funde, 'nimm overlay/… statt white/…').toEqual([]);
    });

    it('keine weisse Auflage in der globalen CSS', () => {
        /* KOMMENTARE ausnehmen: die Datei erklärt an mehreren Stellen, warum
           `rgba(255,255,255,.045)` nicht mehr benutzt wird. Ohne diesen Schritt
           meldete die Prüfung genau diese Erklärungen als Verstoss — ein
           Fehlalarm, nach dem man ihr nicht mehr glaubt. */
        const css = readFileSync(join(process.cwd(), 'src/styles/theme.css'), 'utf8');
        const ohneKommentare = css.replace(/\/\*[\s\S]*?\*\//g, '');
        expect(ohneKommentare, 'nimm rgb(var(--overlay) / …)')
            .not.toMatch(/rgba\(\s*255\s*,\s*255\s*,\s*255/);
        expect(ohneKommentare).not.toMatch(/hsl\(0 0% 100% \//);
    });
});
