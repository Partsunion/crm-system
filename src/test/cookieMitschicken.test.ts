/**
 * Jede Anfrage an die Bot-API muss das Sitzungs-Cookie mitschicken.
 *
 * ─── Warum das eine Regel und keine Gewohnheit ist ─────────────────────────
 *
 * Das Backend hat auf httpOnly-Cookies umgestellt: `/api/admin-auth/login`
 * setzt `admin_session` und liefert das Token in Produktion NICHT mehr im
 * Antwortkörper. Ein Aufruf ohne `credentials: 'include'` bekommt das Cookie
 * beim Anmelden gar nicht erst zu sehen und schickt es danach nicht mit —
 * jede Datenabfrage endet dann in 401.
 *
 * Das war der eigentliche Fehler hinter „Ungültige Anmeldedaten": nicht die
 * Zugangsdaten, sondern die Erwartung eines Tokens, das nicht mehr kommt.
 *
 * Es gibt hier KEINE zentrale Stelle für Anfragen — 39 Aufrufe liegen verteilt
 * über drei Dateien. Eine Gewohnheit hält das nicht zusammen; der nächste neue
 * Aufruf wird von jemandem geschrieben, der ein bestehendes Muster kopiert,
 * und trifft mit einiger Wahrscheinlichkeit eines ohne das Feld. Deshalb diese
 * Prüfung statt eines Kommentars.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const WURZEL = join(process.cwd(), 'src/app');

function alleQuellen(pfad = WURZEL, gesammelt: string[] = []): string[] {
    for (const eintrag of readdirSync(pfad)) {
        const voll = join(pfad, eintrag);
        if (statSync(voll).isDirectory()) alleQuellen(voll, gesammelt);
        else if (/\.tsx?$/.test(eintrag) && !eintrag.includes('.test.')) gesammelt.push(voll);
    }
    return gesammelt;
}

describe('Anfragen an die Bot-API', () => {
    it('schicken alle das Sitzungs-Cookie mit', () => {
        const ohne: string[] = [];

        for (const datei of alleQuellen()) {
            const zeilen = readFileSync(datei, 'utf8').split('\n');

            zeilen.forEach((zeile, i) => {
                // Kommentare zählen nicht — in storage.ts steht `fetch` mehrfach
                // in erklärendem Text, und ein Wächter, der seine eigene
                // Begründung meldet, erzieht zum Abschalten statt zum Lesen.
                const nackt = zeile.trim();
                if (nackt.startsWith('//') || nackt.startsWith('*')) return;
                if (!/\bfetch\(/.test(zeile)) return;

                /* Vier Zeilen Fenster: die Option steht entweder in derselben
                   Zeile (einzeiliger Aufruf) oder als erste Eigenschaft im
                   Optionsobjekt darunter. */
                const fenster = zeilen.slice(i, i + 4).join('\n');
                if (!fenster.includes("credentials: 'include'")) {
                    ohne.push(`${datei.replace(process.cwd() + '/', '')}:${i + 1}`);
                }
            });
        }

        expect(
            ohne,
            "Diese fetch-Aufrufe senden das admin_session-Cookie nicht. Ergänze "
            + "credentials: 'include' — ohne das Cookie antwortet die API mit 401, "
            + 'seit das Token nicht mehr im Antwortkörper kommt.',
        ).toEqual([]);
    });

    it('die Anmeldung kommt ohne Token im Koerper aus', () => {
        /**
         * Hier stand `if (!token) return null` — ein stiller Abbruch, der von
         * aussen wie ein falsches Kennwort aussah, während die Anmeldung
         * serverseitig längst erfolgreich war und das Cookie gesetzt hatte.
         */
        const quelle = readFileSync(join(WURZEL, 'utils/storage.ts'), 'utf8')
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/^\s*\/\/.*$/gm, '');

        expect(
            quelle,
            'ein fehlendes Token darf die Anmeldung nicht mehr abbrechen',
        ).not.toMatch(/if\s*\(\s*!token\s*\)\s*return\s+null/);
        expect(quelle, 'ein vorhandenes Token soll weiter benutzt werden').toMatch(/if\s*\(token\)\s*setToken\(token\)/);
    });
});
