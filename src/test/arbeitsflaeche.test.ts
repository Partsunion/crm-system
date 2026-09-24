/**
 * Die Leadliste hat genau EINEN Scrollbereich pro Spalte — und die Seite keinen.
 *
 * ─── Was das Problem war ───────────────────────────────────────────────────
 *
 * Es gab zwei Scrollbereiche nebeneinander: die Seite selbst und die
 * Detailmaske rechts. Um einen Lead ganz zu sehen, musste man in der Maske
 * scrollen — um die Liste weiterzulesen, die Seite. Und wer mit dem Rad über
 * der Maske ans Ende kam, schob unversehens die Seite weiter, wodurch sich
 * die Maske mitverschob.
 *
 * Wörtlich gemeldet: „wir haben 2 mal scrollen in 2 verschiedenen feldern und
 * das dynamisch, das macht es mega schwer den ganzen lead zu sehen."
 *
 * ─── Warum es leicht zurückfällt ───────────────────────────────────────────
 *
 * Der Aufbau hängt an vier Regeln, von denen drei unscheinbar aussehen. Wer
 * eine davon entfernt — etwa beim Aufräumen ein `min-h-0`, das nach nichts
 * aussieht —, bekommt den alten Zustand zurück, und zwar erst sichtbar, wenn
 * genug Zeilen da sind. In der Entwicklung mit fünf Testleads fällt es nicht
 * auf.
 *
 * Deshalb prüft dieser Test die Quelle und nicht das Aussehen.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const DICHTE = readFileSync('src/app/components/dichte.ts', 'utf8');
const LEADS = readFileSync('src/app/components/LeadsView.tsx', 'utf8');
const MASKE = readFileSync('src/app/components/LeadDetailModal.tsx', 'utf8');
const APP = readFileSync('src/app/App.tsx', 'utf8');
const TOPBAR = readFileSync('src/app/components/layout/Topbar.tsx', 'utf8');

/** Wert einer exportierten Konstanten aus dichte.ts. */
function konstante(name: string): string {
    const t = DICHTE.match(new RegExp(`export const ${name} = '([^']+)'`));
    if (!t) throw new Error(`${name} fehlt in dichte.ts`);
    return t[1];
}

describe('Aufbau der Arbeitsfläche', () => {
    it('die Ansicht fuellt den Bildschirm, statt mitzuscrollen', () => {
        expect(konstante('VOLLE_HOEHE')).toContain('h-full');
        expect(LEADS, 'die Leadliste benutzt VOLLE_HOEHE nicht').toContain('VOLLE_HOEHE');
    });

    it('jede Spalte hat min-h-0 — sonst waechst sie ueber den Rand', () => {
        // Ein Flex-Kind hat als Mindesthoehe seinen INHALT, nicht null. Ohne
        // die Regel wird die Spalte so hoch wie ihre Zeilen, statt zu
        // scrollen, und die ganze Konstruktion faellt auf den vorigen Zustand
        // zurueck. Sichtbar erst ab genug Zeilen.
        for (const name of ['VOLLE_HOEHE', 'ARBEITSFLAECHE', 'SPALTE_SCROLLT']) {
            expect(konstante(name), `${name} ohne min-h-0`).toContain('min-h-0');
        }
    });

    it('die Spalten scrollen fuer sich und rutschen nicht durch', () => {
        // overscroll-contain ist der eigentliche Punkt: ohne die Regel
        // scrollt der Browser am Ende einer Spalte den naechsten Bereich
        // weiter — genau das Durchrutschen, das sich „dynamisch" anfuehlte.
        expect(konstante('SPALTE_SCROLLT')).toContain('overflow-y-auto');
        expect(konstante('SPALTE_SCROLLT')).toContain('overscroll-contain');
        expect(MASKE, 'der Inhalt der Maske rutscht durch')
            .toMatch(/overflow-y-auto overscroll-contain/);
    });

    it('die Maske klebt nicht mehr und rechnet ihre Hoehe nicht aus', () => {
        // Kleben hiess: die Seite scrollt, die Maske bleibt scheinbar stehen —
        // und ihre Hoehe musste aus Kopfzeile und Klebeabstand errechnet
        // werden. Zwei Zahlen, die auseinanderliefen; die Fusszeile mit dem
        // Loeschen-Knopf lag dadurch 24 px unter dem Bildschirmrand.
        // Die Seitennavigation darf innerhalb der Listenspalte sichtbar bleiben.
        // Entscheidend ist, dass die Detailmaske selbst nicht wieder klebt.
        const detailspalten = (LEADS.match(/<aside\b[\s\S]*?<\/aside>/g) ?? [])
            .filter(spalte => spalte.includes('<LeadDetailModal'));
        expect(detailspalten, 'keine Detailspalte gefunden').toHaveLength(1);
        expect(detailspalten[0], 'die Detailspalte klebt wieder').not.toMatch(/\bsticky\b/);
        expect(MASKE, 'die Maske klebt wieder').not.toMatch(/\bsticky\b/);
        expect(MASKE, 'da wird wieder eine Hoehe ausgerechnet')
            .not.toMatch(/max-h-\[calc\(100[dv]h/);
        expect(MASKE, 'die Maske fuellt ihre Spalte nicht')
            .toMatch(/flex min-h-0 flex-1 flex-col/);
    });

    it('der Kopf bleibt stehen, die Kennzahlen scrollen mit', () => {
        expect(konstante('KOPF_BEREICH')).toContain('shrink-0');
        expect(LEADS).toContain('KOPF_BEREICH');

        // Ab der JSX-Verwendung schneiden, nicht ab der Importzeile — die
        // steht ganz oben und liefert einen leeren Ausschnitt.
        const kopf = LEADS.slice(
            LEADS.indexOf('cn(KOPF_BEREICH'),
            LEADS.indexOf('cn(ARBEITSFLAECHE'),
        );
        expect(kopf.length, 'Ausschnitt leer — der Test prueft nichts').toBeGreaterThan(200);
        expect(kopf, 'die Filter sind aus dem Kopf verschwunden').toContain('<SegmentBar');

        // Der Titelblock gehoert ueber BEIDE Spalten. In der Listenspalte
        // hatte er nur deren Breite, die fuenf Knoepfe nahmen sie fast ganz
        // ein, und der Untertitel stand mit einem Wort pro Zeile
        // untereinander — daneben eine grosse leere Flaeche.
        expect(kopf, 'der Titel ist wieder in die schmale Spalte gewandert')
            .toContain('<PageHeader');

        // Die Kennzahlen dagegen scrollen mit: fest im Kopf kosten sie rund
        // 80 px, die auf einem 13-Zoll-Bildschirm der Arbeitsflaeche fehlen.
        expect(kopf, 'die Kennzahlen stehen wieder fest im Kopf').not.toContain('<StatCard');
        expect(LEADS, 'die Leadliste soll keine dekorativen Kennzahlkarten mehr haben').not.toContain('<StatCard');
        expect(kopf, 'die kompakte Ergebnisanzahl fehlt').toContain("filteredLeads.length+' von '+leads.length+' Leads'");
    });

    it('der Seitenkopf zerdrueckt seinen Titel nicht', () => {
        // Vorher gaben die Aktionen nie nach (flex-shrink-0 in einer Zeile).
        // In einer schmalen Spalte blieb dem Titelblock gut hundert Pixel,
        // und der Untertitel stand mit EINEM WORT PRO ZEILE untereinander.
        // Der Fehler war schon vorher da — er brauchte nur eine Breite, die
        // es bis dahin nicht gab.
        const uiKit = readFileSync('src/app/components/ui-kit.tsx', 'utf8');
        // Bis zum naechsten Export schneiden, nicht bis zur naechsten Zeile
        // mit schliessender Klammer — die Typdeklaration der Eigenschaften
        // enthaelt schon eine, und der Ausschnitt endete vor dem JSX.
        const start = uiKit.indexOf('export function PageHeader');
        const rumpf = uiKit.slice(start, uiKit.indexOf('\nexport ', start + 1));
        expect(rumpf, 'der Titelblock hat keine Mindestbreite').toMatch(/min-w-\[\d+rem\] flex-1/);
        expect(rumpf, 'ohne Umbruch werden die Knoepfe wieder den Titel zerdruecken')
            .toContain('flex flex-wrap items-end');
    });

    it('die Huelle gibt eine feste Hoehe vor, an der h-full haengen kann', () => {
        // `h-full` ist height:100% und braucht einen Elternteil mit
        // bestimmter Hoehe. Ohne h-screen aussen faellt alles in sich zusammen.
        expect(APP).toContain('className={WORKSPACE_FRAME}');
        expect(readFileSync('src/app/components/layout/workspaceShell.ts', 'utf8')).toContain('h-screen h-dvh');
        expect(APP, 'der Bereich um die Ansicht traegt h-full nicht')
            .toMatch(/ansicht-herein h-full/);
    });

    it('das Statusmenue kann nach oben aufklappen', () => {
        // Ein absolut positioniertes Menue wird vom naechsten scrollenden
        // Elternteil beschnitten. Solange die Seite scrollte, war das die
        // Seite — hoch genug, dass es kaum auffiel. Jetzt ist es die Spalte,
        // und bei neun Status waere das Menue in den unteren Zeilen
        // angeschnitten. Ohne diese Regel kaeme man an die letzten Eintraege
        // nicht heran.
        const uiKit = readFileSync('src/app/components/ui-kit.tsx', 'utf8');
        expect(uiKit, 'das Menue klappt nur noch nach unten')
            .toContain("nachOben ? 'bottom-full mb-1' : 'top-full mt-1'");
        expect(uiKit, 'die Richtung wird nicht gemessen').toContain('getBoundingClientRect');
        // Auch nach oben reicht der Platz irgendwann nicht — dann blaettern.
        expect(uiKit).toMatch(/max-h-\[min\(20rem,60vh\)\] overflow-y-auto/);
    });

    it('der Inhalt der Kopfzeile passt in ihre feste Hoehe', () => {
        // Sie ist auf h-14 (56 px) festgelegt. Ohne vertikales Padding bleibt
        // um das hoechste Bauteil (h-9, 36 px) ausreichend Luft. Waechst der
        // Inhalt, schneidet h-14 ihn ab — und die Arbeitsflaeche darunter
        // bekaeme unbemerkt weniger Platz.
        expect(TOPBAR).toContain("className={cn(WORKSPACE_HEADER,");
        const shell = readFileSync('src/app/components/layout/workspaceShell.ts', 'utf8');
        const header = shell.match(/WORKSPACE_HEADER = '([^']+)'/)?.[1] ?? '';
        expect(header).toContain('h-[60px]');
        const t = header.match(/py-([\d.]+)/);
        const innen = t ? Number(t[1]) * 4 * 2 : 0;
        expect(innen + 36).toBeLessThanOrEqual(60);
    });
});
