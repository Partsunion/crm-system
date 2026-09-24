/**
 * Kein Inline-Skript in der index.html — die Auslieferung verbietet es.
 *
 * ─── Was passiert ist ──────────────────────────────────────────────────────
 *
 * In der index.html stand ein `<script>` ohne `src`, das das Erscheinungsbild
 * vor dem ersten Zeichnen setzte. Die gehärtete nginx-Konfiguration erlaubt
 * aber nur Skripte gleicher Herkunft (`script-src 'self'`), und der Browser
 * verweigerte die Ausführung:
 *
 *     Refused to execute a script because its hash, its nonce, or
 *     'unsafe-inline' does not appear in the script-src directive
 *
 * Das Tückische: es bricht nichts sichtbar. Die Anwendung lädt, nur das
 * gespeicherte Erscheinungsbild greift nicht mehr — ein Fehler, den man erst
 * bemerkt, wenn jemand die Konsole öffnet.
 *
 * Der Test prüft beide Seiten: keine Inline-Skripte in der Quelle UND die
 * Regel in der nginx-Konfiguration bleibt streng. Wer das nächste Mal ein
 * Inline-Skript braucht, soll `'unsafe-inline'` nicht heimlich ergänzen
 * können — das öffnet den Schutz für jedes eingeschleuste Skript.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Auslieferung und Sicherheitsregel passen zusammen', () => {
    it('index.html enthält kein Inline-Skript', () => {
        const html = readFileSync('index.html', 'utf8');
        const skripte = html.match(/<script(?![^>]*\bsrc=)[^>]*>/g) ?? [];
        expect(
            skripte,
            'Inline-Skripte werden von der Auslieferung blockiert — als Datei '
            + 'nach public/ legen und per src einbinden',
        ).toEqual([]);
    });

    it('das Erscheinungsbild wird weiterhin vor dem ersten Bild gesetzt', () => {
        const html = readFileSync('index.html', 'utf8');
        expect(html, 'ohne diese Zeile blitzt Dunkel auf, bevor Hell greift')
            .toContain('src="/theme-init.js"');
        // Aus public/, nicht aus src/: sonst zieht Vite die Datei ins
        // Hauptbuendel und sie laeuft erst nach dem ersten Bild.
        expect(readFileSync('public/theme-init.js', 'utf8')).toContain('data-theme');
    });

    it('die Sicherheitsregel bleibt ohne unsafe-inline', () => {
        const nginx = readFileSync('nginx.conf', 'utf8');
        expect(nginx).toContain("script-src 'self'");
        expect(
            nginx.includes("'unsafe-inline'") && /script-src[^;]*'unsafe-inline'/.test(nginx),
            'unsafe-inline im script-src oeffnet den Schutz fuer jedes '
            + 'eingeschleuste Skript — der bequeme, falsche Weg',
        ).toBe(false);
    });
});
