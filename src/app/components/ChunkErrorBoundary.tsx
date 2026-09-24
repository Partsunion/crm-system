/**
 * ChunkErrorBoundary — fängt veraltete Nachlade-Stücke nach einer Auslieferung.
 *
 * ─── Was hier schiefgeht ───────────────────────────────────────────────────
 *
 * Das CRM lädt seine Ansichten erst beim Aufruf nach (`lazy(() => import(…))`).
 * Die Dateinamen tragen eine Prüfsumme des Inhalts: `PipelineSettings-Bx7Kq.js`.
 * Nach einem neuen Bau heissen sie anders — der alte Name ist weg, 404.
 *
 * Wer die Seite VOR einer Auslieferung geöffnet hat, hat die alte `index.html`
 * im Speicher. Klickt er danach auf eine Ansicht, die noch nicht geladen war
 * (etwa "Pipeline-Setup"), fragt der Browser den alten Namen an, bekommt 404,
 * und React wirft:
 *
 *     TypeError: Importing a module script failed.
 *
 * Der allgemeine ErrorBoundary zeigte daraufhin "Das CRM konnte nicht geladen
 * werden — meistens liegt das an einer fehlenden API-Verbindung". Das ist die
 * falsche Fährte: mit der API hat es nichts zu tun, und der Nutzer sitzt vor
 * einer Sackgasse, obwohl ein Neuladen genügt.
 *
 * ─── Warum automatisch neu laden ───────────────────────────────────────────
 *
 * Weil die richtige Reaktion IMMER dieselbe ist. Es gibt hier nichts zu
 * entscheiden: die neue Fassung liegt bereit, der Browser hält nur noch die
 * alte Landkarte. Ein Hinweis "bitte neu laden" verlangt vom Nutzer eine
 * Handlung, deren Ergebnis feststeht.
 *
 * Genau EINMAL pro Sitzung, festgehalten im sessionStorage. Ohne diese Sperre
 * entsteht eine Schleife, wenn das Neuladen das Problem nicht löst — und eine
 * Seite, die sich endlos neu lädt, ist schlimmer als eine Fehlermeldung.
 *
 * Gleichlautend mit Admin-Dashboard/src/components/ChunkErrorBoundary.tsx.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';

const NEULADE_MARKE = 'pu.crm.chunk-reloaded';

/**
 * Die Meldungen unterscheiden sich je nach Browser und Bündler — deshalb
 * mehrere Muster statt eines. Safari sagt "Importing a module script failed",
 * Chrome "Failed to fetch dynamically imported module", Firefox "error loading
 * dynamically imported module", ältere Bündler "Loading chunk 3 failed".
 */
function istNachladeFehler(err: unknown): boolean {
    if (!err) return false;
    const e = err as { name?: string; message?: string };
    if (e.name === 'ChunkLoadError') return true;
    const text = String(e.message ?? '');
    return (
        /Loading chunk \d+ failed/i.test(text)
        || /Failed to fetch dynamically imported module/i.test(text)
        || /Importing a module script failed/i.test(text)
        || /error loading dynamically imported module/i.test(text)
    );
}

interface Props {
    children: ReactNode;
}
interface State {
    fehler: boolean;
}

export class ChunkErrorBoundary extends Component<Props, State> {
    state: State = { fehler: false };

    static getDerivedStateFromError(error: unknown): State {
        /**
         * NUR Nachladefehler gehören hierher. Alles andere — ein Tippfehler im
         * Rendern, eine Ausnahme aus der API — muss zum äusseren
         * ErrorBoundary durchreichen, der die richtige Meldung zeigt. Würde
         * dieser hier alles fangen, bekäme der Nutzer bei jedem Absturz
         * "Neue Fassung verfügbar" zu lesen und die echte Ursache bliebe
         * unsichtbar.
         */
        if (!istNachladeFehler(error)) throw error;

        if (!leseMarke()) {
            setzeMarke();
            window.location.reload();
        }
        return { fehler: true };
    }

    componentDidCatch(error: unknown, _info: ErrorInfo): void {
        if (!istNachladeFehler(error)) throw error;
    }

    render(): ReactNode {
        if (!this.state.fehler) return this.props.children;

        // Nur erreichbar, wenn das automatische Neuladen schon einmal nicht
        // geholfen hat. Dann ist der Knopf die ehrliche Antwort.
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 text-center">
                <h1 className="mb-2 font-display text-xl font-semibold text-text-primary">
                    Neue Fassung verfügbar
                </h1>
                <p className="mb-4 text-sm text-text-secondary">
                    Diese Seite läuft noch auf einem älteren Stand. Bitte neu laden.
                </p>
                <button
                    type="button"
                    onClick={() => {
                        loescheMarke();
                        window.location.reload();
                    }}
                    className="h-10 rounded-md bg-accent-600 px-4 text-sm font-medium text-white transition-colors hover:bg-accent-700"
                >
                    Neu laden
                </button>
            </div>
        );
    }
}

/* sessionStorage kann fehlen (privater Modus, gesperrte Speicher). Dann wird
   eben nicht neu geladen — das ist der harmlosere Ausgang als ein Absturz im
   Fehlerbehandler selbst. */
function leseMarke(): boolean {
    try {
        return sessionStorage.getItem(NEULADE_MARKE) !== null;
    } catch {
        return true; // im Zweifel NICHT neu laden
    }
}
function setzeMarke(): void {
    try {
        sessionStorage.setItem(NEULADE_MARKE, '1');
    } catch {
        /* ignorieren */
    }
}
function loescheMarke(): void {
    try {
        sessionStorage.removeItem(NEULADE_MARKE);
    } catch {
        /* ignorieren */
    }
}

export default ChunkErrorBoundary;
