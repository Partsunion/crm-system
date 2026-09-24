/**
 * Gespeichert heisst gespeichert — auch auf dem Server.
 *
 * ─── Der Fehler, den das verhindert ────────────────────────────────────────
 *
 * `saveSettings` prüfte die Antwort des Servers nicht. `fetch` wirft nur bei
 * Netzfehlern; eine 403, weil dem Benutzer `settings.write` fehlt, kommt als
 * ganz normale Antwort zurück. Der Aufrufer meldete daraufhin „gespeichert".
 *
 * Beim nächsten Laden holt `syncSettingsFromServer` den Serverstand und
 * überschreibt den lokalen. Die Änderung war weg — ohne Meldung, ohne
 * Eintrag im Protokoll. Wem das Recht fehlt, dem passierte das bei JEDER
 * Änderung, an sechs verschiedenen Stellen der Oberfläche.
 *
 * Der Test prüft beides: dass die Fehlerfälle als Fehler zurückkommen, und
 * dass keine der sechs Stellen wieder am Ergebnis vorbei meldet.
 */
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('Einstellungen speichern', () => {
    beforeEach(() => {
        vi.resetModules();
        localStorage.clear();
    });

    async function speichernMit(antwort: Partial<Response> | Error) {
        vi.stubGlobal('fetch', vi.fn(() =>
            antwort instanceof Error ? Promise.reject(antwort) : Promise.resolve(antwort as Response)));
        const { saveSettings, getSettings } = await import('../app/utils/storage');
        return saveSettings(getSettings());
    }

    it('meldet Erfolg, wenn der Server annimmt', async () => {
        await expect(speichernMit({ ok: true, status: 200 })).resolves.toEqual({ ok: true });
    });

    it('meldet FEHLER bei fehlender Berechtigung', async () => {
        // Der Fall, der vorher als Erfolg durchging.
        const e = await speichernMit({ ok: false, status: 403 });
        expect(e.ok).toBe(false);
        expect(e.grund).toMatch(/Berechtigung/);
    });

    it('meldet FEHLER bei abgelaufener Sitzung', async () => {
        expect((await speichernMit({ ok: false, status: 401 })).ok).toBe(false);
    });

    it('meldet FEHLER bei einem Serverfehler', async () => {
        const e = await speichernMit({ ok: false, status: 500 });
        expect(e.ok).toBe(false);
        expect(e.grund).toMatch(/500/);
    });

    it('meldet FEHLER, wenn der Server nicht erreichbar ist', async () => {
        const e = await speichernMit(new Error('Netz weg'));
        expect(e.ok).toBe(false);
        expect(e.grund).toMatch(/nicht erreichbar/);
    });

    it('übernimmt abgelehnte Einstellungen nicht in den gültigen Stand', async () => {
        await speichernMit({ ok: false, status: 403 });
        expect(localStorage.getItem('haendler_crm_settings')).toBeNull();
    });
});

describe('Keine Stelle meldet am Ergebnis vorbei', () => {
    /** Alle Dateien, die Einstellungen schreiben. */
    const DATEIEN = [
        'src/app/components/Settings.tsx',
        'src/app/components/PipelineSettings.tsx',
    ];

    it.each(DATEIEN)('%s ruft saveSettings nicht direkt auf', (datei) => {
        const quelle = readFileSync(datei, 'utf8');
        expect(
            quelle.includes('saveSettings('),
            'saveSettings direkt aufgerufen — dann liegt es wieder am Aufrufer, '
            + 'das Ergebnis auszuwerten. einstellungenSichern() nehmen.',
        ).toBe(false);
    });

    it.each(DATEIEN)('%s meldet ueber einstellungenSichern', (datei) => {
        expect(readFileSync(datei, 'utf8')).toContain('einstellungenSichern');
    });

    it('einstellungenSichern wertet das Ergebnis wirklich aus', () => {
        const quelle = readFileSync('src/app/utils/einstellungenSichern.ts', 'utf8');
        expect(quelle).toMatch(/ergebnis\.ok/);
        expect(quelle).toMatch(/toast\.error/);
        // Die Fehlermeldung MUSS sagen, dass die Aenderung verlorengeht —
        // sonst haelt man es fuer eine Kleinigkeit und merkt es zu spaet.
        expect(quelle).toMatch(/bisher gespeicherte Stand bleibt gültig/);
    });
});
