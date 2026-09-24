/**
 * Der Fänger für veraltete Nachlade-Stücke.
 *
 * ─── Was er leisten muss ───────────────────────────────────────────────────
 *
 * ZWEI Dinge, und das zweite ist das wichtigere:
 *
 *   1. Einen Nachladefehler fangen und einmal neu laden.
 *   2. ALLES ANDERE durchreichen.
 *
 * Ein Fehlerfänger, der zu viel fängt, ist schlimmer als keiner: er verwandelt
 * jeden Absturz in "Neue Fassung verfügbar", der Nutzer lädt neu, es passiert
 * wieder, und die echte Ursache taucht nirgends auf. Deshalb prüft dieser Test
 * beide Richtungen.
 *
 * Der Anlass: nach einer Auslieferung zeigte das CRM
 * "TypeError: Importing a module script failed" hinter der Meldung "Das CRM
 * konnte nicht geladen werden — meistens liegt das an einer fehlenden
 * API-Verbindung". Mit der API hatte es nichts zu tun; der Browser hielt nur
 * die alte index.html und fragte Dateinamen an, die es nach dem neuen Bau
 * nicht mehr gab.
 */
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChunkErrorBoundary } from '../app/components/ChunkErrorBoundary';

/** Baustein, der beim Rendern wirft. */
function Wirft({ fehler }: { fehler: Error }): JSX.Element {
    throw fehler;
}

function nachladeFehler(text: string): Error {
    return new Error(text);
}

beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
    // React schreibt gefangene Fehler auf die Konsole — im Test nur Rauschen.
    vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('Nachlade-Fänger', () => {
    it.each([
        ['Importing a module script failed.'],                       // Safari
        ['Failed to fetch dynamically imported module: /assets/x.js'], // Chrome
        ['error loading dynamically imported module'],                // Firefox
        ['Loading chunk 7 failed.'],                                  // ältere Bündler
    ])('faengt "%s" und laedt einmal neu', (text) => {
        const neuLaden = vi.fn();
        vi.stubGlobal('location', { ...window.location, reload: neuLaden });

        render(
            <ChunkErrorBoundary>
                <Wirft fehler={nachladeFehler(text)} />
            </ChunkErrorBoundary>,
        );

        expect(neuLaden, 'die richtige Reaktion ist immer dieselbe').toHaveBeenCalledTimes(1);
    });

    it('laedt NUR EINMAL pro Sitzung neu', () => {
        /**
         * Ohne diese Sperre entsteht eine Schleife, sobald das Neuladen das
         * Problem nicht löst — und eine Seite, die sich endlos neu lädt, ist
         * schlimmer als eine Fehlermeldung: man kommt nicht einmal mehr an die
         * Entwicklerwerkzeuge.
         */
        const neuLaden = vi.fn();
        vi.stubGlobal('location', { ...window.location, reload: neuLaden });

        render(
            <ChunkErrorBoundary>
                <Wirft fehler={nachladeFehler('Importing a module script failed.')} />
            </ChunkErrorBoundary>,
        );
        render(
            <ChunkErrorBoundary>
                <Wirft fehler={nachladeFehler('Importing a module script failed.')} />
            </ChunkErrorBoundary>,
        );

        expect(neuLaden).toHaveBeenCalledTimes(1);
        // Beim zweiten Mal steht der Knopf da statt einer weiteren Ladung.
        expect(screen.getAllByText(/Neue Fassung verfügbar/).length).toBeGreaterThan(0);
    });

    it('reicht jeden ANDEREN Fehler durch', () => {
        /**
         * Der Teil, der den Fänger gutartig hält. Ein Tippfehler im Rendern
         * oder eine Ausnahme aus der API muss beim äusseren ErrorBoundary
         * ankommen, der die richtige Diagnose zeigt.
         */
        const neuLaden = vi.fn();
        vi.stubGlobal('location', { ...window.location, reload: neuLaden });

        expect(() =>
            render(
                <ChunkErrorBoundary>
                    <Wirft fehler={new Error('Cannot read properties of undefined')} />
                </ChunkErrorBoundary>,
            ),
        ).toThrow(/Cannot read properties of undefined/);

        expect(neuLaden, 'ein gewöhnlicher Absturz darf NICHT neu laden').not.toHaveBeenCalled();
    });
});
