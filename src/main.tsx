import ReactDOM from 'react-dom/client'
import { Toaster } from 'sonner'
import App from './app/App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ChunkErrorBoundary } from './app/components/ChunkErrorBoundary'
// Selbst gehostete Marken-Schriften (DSGVO: kein CDN). VOR index.css, damit
// die font-family-Stacks aus theme.css auf geladene Schriften treffen.
//
// Ohne diese Zeilen deklarierte das CRM zwar "Inter" und "IBM Plex Mono", lud
// sie aber nie: 0 Webfonts, gemessen an der ausgelieferten Seite. Wer Inter
// zufaellig installiert hatte, sah sie; alle anderen bekamen system-ui, und
// IBM Plex Mono fehlte ausnahmslos. Zwei Anwendungen derselben Firma sahen
// damit je nach Rechner unterschiedlich aus.
// Schriften des Redesigns vom 2026-07-30: Space Grotesk für Überschriften,
// Manrope für Text, JetBrains Mono für Marken und Zahlen. Selbst gehostet, kein
// Google-CDN — dieselbe Begründung wie im Admin-Dashboard.
//
// Inter und IBM Plex Mono sind ausgebaut: sie werden nach der Umstellung von
// keiner Regel mehr genannt (theme.css verweist nur noch auf var(--font-…)),
// und Schriften zu laden, die niemand benutzt, kostet nur Bandbreite.
import '@fontsource-variable/space-grotesk'
import '@fontsource-variable/manrope'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
    <ErrorBoundary>
        {/* Der Nachlade-Fänger sitzt INNEN.
         *
         * Ein veraltetes Nachlade-Stück nach einer Auslieferung ist kein
         * Absturz, sondern ein Hinweis: die Seite läuft auf einem alten Stand.
         * Er wird deshalb hier gefangen und mit einem einmaligen Neuladen
         * beantwortet, bevor der äussere ErrorBoundary "Das CRM konnte nicht
         * geladen werden — meistens liegt das an der API-Verbindung" zeigt.
         * Diese Meldung war schlicht falsch und schickte in die falsche
         * Richtung.
         *
         * Alles ANDERE reicht der Fänger durch — er wirft es bewusst weiter,
         * damit echte Abstürze weiterhin die richtige Diagnose bekommen.
         */}
        <ChunkErrorBoundary>
            <App />
        </ChunkErrorBoundary>
        {/* Kein festes theme/richColors: die var()-Styles unten folgen dem
            Light-/Dark-Umschalter automatisch; richColors-Presets wären fest
            auf ein Theme gemünzt. Icons bleiben farbig (success grün etc.). */}
        <Toaster
            position="bottom-right"
            closeButton
            toastOptions={{
                style: {
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-strong)',
                    color: 'var(--text-primary)',
                },
            }}
        />
    </ErrorBoundary>,
)
