/**
 * Bildprobe des CRM-Redesigns — schreibt Seiten mit dem ECHTEN Markup der
 * Komponenten und der ECHTEN gebauten CSS nach `dist-probe/`.
 *
 * ─── Warum das nötig ist ───────────────────────────────────────────────────
 *
 * Ich kann mich nicht anmelden und die Seite nicht selbst aufrufen. Ohne so
 * eine Probe bliebe „das Redesign ist übernommen" eine Behauptung. Hier läuft
 * derselbe Code, der später im Browser läuft, gegen dieselbe CSS-Datei, die
 * ausgeliefert wird — der Unterschied zur laufenden Anwendung sind nur die
 * ausgedachten Daten.
 *
 * ─── Was sie zuverlässig findet ────────────────────────────────────────────
 *
 * Tailwind schneidet jede Klasse weg, die in keiner Quelldatei steht. Ein
 * Tippfehler wie `gap-4.5` (gibt es in der Skala nicht) oder eine Farbe, die
 * es nicht gibt, erzeugt KEINEN Fehler — die Klasse tut einfach nichts. Am
 * Bild sieht man es, in der Konsole nicht. Im Admin-Dashboard hat genau diese
 * Prüfung vier solche Fälle gefunden.
 *
 * Läuft absichtlich nur, wenn `dist/` gebaut ist. Sonst wird die Probe
 * übersprungen statt rot zu werden: ein fehlender Build ist kein Fehler im
 * Code.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, waitFor } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Nur die Datenschicht wird vorgetäuscht. Das Markup ist echt.
 *
 * Die Leads sind erfunden, aber realistisch verteilt: einige zugewiesen, einige
 * nicht, einige mit fälligem Follow-up. Damit sieht man die Anordnung mit
 * Inhalt — und dass die Sätze im Begrüßungsbereich sich nach den Zahlen
 * richten, statt fest zu stehen.
 */
const LEADS = Array.from({ length: 42 }, (_, i) => ({
    id: `l${i}`,
    company: `Autoteile ${i + 1} GmbH`,
    contactPerson: `Kontakt ${i + 1}`,
    email: `kontakt${i + 1}@beispiel.de`,
    phone: i % 3 === 0 ? undefined : `+49 30 ${1000000 + i}`,
    // Gross geschrieben wie die echten Standardstatus (storage.ts,
    // defaultSettings). Klein geschrieben griff die Farbzuordnung in
    // STATUS_COLORS nicht und alles bekam Hash-Farben — "Verloren" wurde grün.
    // Der Fehler lag in dieser Attrappe, nicht in der Anwendung.
    status: ['Neu', 'Kontaktiert', 'Qualifiziert', 'Gewonnen', 'Verloren'][i % 5],
    source: ['Website', 'Empfehlung', 'Messe'][i % 3],
    value: (i % 7) * 1500,
    assignedTo: i % 4 === 0 ? undefined : ['Aaron', 'Elias', 'Bardia'][i % 3],
    tags: [],
    nextFollowUpDate: i % 6 === 0 ? '2026-07-29' : undefined,
    stageEnteredAt: i % 4 === 0 ? '2026-07-01T10:00:00.000Z' : '2026-09-01T10:00:00.000Z',
    createdAt: '2026-07-20T10:00:00.000Z',
    updatedAt: '2026-07-29T10:00:00.000Z',
}));

vi.mock('../app/utils/storage', () => ({
    getLeads: () => Promise.resolve(LEADS),
    getSettings: () => ({ pipelineStages: ['Neu', 'Kontaktiert', 'Qualifiziert', 'Gewonnen', 'Verloren'].map((name, index) => ({ id: String(index), name, isActive: true, order: index, probability: [10, 30, 65, 100, 0][index], category: name === 'Gewonnen' ? 'won' : name === 'Verloren' ? 'lost' : 'open' })) }),
    getCurrentUser: () => ({ id: 'sales-1', username: 'aaron', name: 'Aaron Vogt', role: 'Vertrieb' }),
    getAppointments: () => Promise.resolve([
        { id: 'a1', type: 'quali', assignee_id: 'sales-1', assignee_name: 'Aaron Vogt', customer_name: 'Autoteile Nord GmbH', customer_email: 'nord@beispiel.invalid',
          title: 'Erstgespräch', start_at: new Date().toISOString(), end_at: new Date(Date.now() + 30 * 60_000).toISOString(), duration_minutes: 30, status: 'confirmed' },
        { id: 'a2', type: 'sales', assignee_id: 'sales-1', assignee_name: 'Aaron Vogt', customer_name: 'Werkstatt Süd', customer_email: 'sued@beispiel.invalid',
          title: 'Angebot besprechen', start_at: new Date(Date.now() + 36e5).toISOString(), end_at: new Date(Date.now() + 36e5 + 45 * 60_000).toISOString(), duration_minutes: 45, status: 'proposed' },
    ]),
    // Form wie die echte Funktion: AppointmentAdmin[] mit `username`, nicht
    // bloss Strings. Mit Strings war `x.username` undefined und das Dashboard
    // stürzte ab — der Absturz war echt, nur ausgelöst durch eine falsche
    // Attrappe. Die Absicherung dagegen steht jetzt im Dashboard.
    getAppointmentAdmins: () => Promise.resolve([
        { id: 'sales-1', username: 'aaron', name: 'Aaron Vogt', email: 'aaron@beispiel.invalid' },
        { id: 'sales-2', username: 'elias', name: 'Elias Nord', email: 'elias@beispiel.invalid' },
        { id: 'sales-3', username: 'bardia', name: 'Bardia Süd', email: 'bardia@beispiel.invalid' },
    ]),
    getTeams: () => Promise.resolve([{ id: 'team-1', name: 'Vertrieb Nord', active: true, memberIds: ['sales-1', 'sales-2'] }]),
    getStatusOptions: () => ['Neu', 'Kontaktiert', 'Qualifiziert', 'Gewonnen', 'Verloren'],
    getLeadLists: () => Promise.resolve([]),
    saveLead: vi.fn(), deleteLead: vi.fn(), createLeadList: vi.fn(), deleteLeadList: vi.fn(),
    addLeadsToList: vi.fn(), removeLeadsFromList: vi.fn(), enrichMissingContacts: vi.fn(),
    createAppointment: vi.fn(), updateAppointment: vi.fn(), cancelAppointment: vi.fn(), deleteAppointment: vi.fn(),
}));

// Diese Importe stehen bewusst NACH den vi.mock-Aufrufen: vitest hebt
// vi.mock hoch, aber die Reihenfolge im Quelltext macht sichtbar, dass die
// Attrappen zuerst greifen müssen.
import { Dashboard } from '../app/components/Dashboard';
import { Sidebar } from '../app/components/layout/Sidebar';
import { Topbar } from '../app/components/layout/Topbar';
import { PipelineView } from '../app/components/PipelineView';
import { LeadsView } from '../app/components/LeadsView';
import { KalenderView } from '../app/components/KalenderView';

const DIST = join(process.cwd(), 'dist');
const DIST_ASSETS = join(DIST, 'assets');
const AUSGABE = join(process.cwd(), 'dist-probe');

function gebauteCss(): string | null {
    if (!existsSync(DIST_ASSETS)) return null;
    const dateien = readdirSync(DIST_ASSETS).filter((f) => f.endsWith('.css'));
    // Die grösste CSS ist die der Anwendung.
    if (dateien.length === 0) return null;
    const groesste = dateien
        .map((f) => ({ f, n: readFileSync(join(DIST_ASSETS, f), 'utf8').length }))
        .sort((a, b) => b.n - a.n)[0];
    return readFileSync(join(DIST_ASSETS, groesste.f), 'utf8');
}

/**
 * Schriften und Bilder mitkopieren.
 *
 * Ohne die woff2-Dateien fällt die Probe auf die Systemschrift zurück, und
 * dann stimmen alle gemessenen Umbrüche nicht — Space Grotesk hat andere
 * Buchstabenbreiten. Ohne die Dateien aus `public/` zeigt die Probe beim Logo
 * das Platzhaltersymbol für ein defektes Bild, was im Bildschirmfoto wie ein
 * Logo aussieht.
 */
function beiwerkKopieren(): void {
    mkdirSync(join(AUSGABE, 'assets'), { recursive: true });
    if (existsSync(DIST_ASSETS)) {
        for (const f of readdirSync(DIST_ASSETS).filter((n) => n.endsWith('.woff2'))) {
            copyFileSync(join(DIST_ASSETS, f), join(AUSGABE, 'assets', f));
        }
    }
    // Aus dem gebauten dist/, nicht aus public/ — so wird auch geprüft, dass
    // die Datei den Build überhaupt überlebt.
    if (existsSync(DIST)) {
        for (const f of readdirSync(DIST).filter((n) => /\.(png|svg|ico)$/.test(n))) {
            copyFileSync(join(DIST, f), join(AUSGABE, f));
        }
    }
}

function seite(titel: string, css: string, markup: string, zusatz = ''): string {
    return `<!doctype html>
<html lang="de" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titel}</title>
<style>${css}</style>
<style>
  /* Nur Sichtbarkeit erzwingen — alles andere kommt aus der ausgelieferten CSS. */
  ${zusatz}
</style>
</head>
<body class="bg-canvas text-text-primary">${markup}</body>
</html>`;
}

const NUTZER = { username: 'aaron', name: 'Aaron Vogt', role: 'Admin' } as never;

describe('Bildprobe CRM-Redesign', () => {
    afterEach(() => vi.unstubAllGlobals());
    const css = gebauteCss();

    it.skipIf(!css)('schreibt Hülle (Leiste + Kopfzeile) nach dist-probe/', () => {
        const markup = renderToStaticMarkup(
            <div className="flex h-screen w-screen overflow-hidden bg-canvas text-text-primary">
                <Sidebar
                    activeView="dashboard"
                    onNavigate={() => {}}
                    mobileOpen={false}
                    onMobileOpenChange={() => {}}
                />
                <div className="flex min-w-0 flex-1 flex-col">
                    <Topbar
                        title="Dashboard"
                        user={NUTZER}
                        onOpenMobileSidebar={() => {}}
                        onOpenPalette={() => {}}
                        onRefresh={() => {}}
                        onNewLead={() => {}}
                        onLogout={() => {}}
                    />
                    <main className="flex-1 overflow-auto" />
                </div>
            </div>,
        );

        mkdirSync(AUSGABE, { recursive: true });
        beiwerkKopieren();
        writeFileSync(join(AUSGABE, 'huelle.html'), seite('Probe — CRM', css!, markup), 'utf8');

        // Die Merkmale des Redesigns stehen wirklich im Markup.
        expect(markup).toContain('Vertrieb');
        expect(markup).toContain('w-64');
        expect(markup).toContain('Arbeitsübersicht');
        expect(markup).toContain('bg-surface');
        expect(markup).not.toContain('backdrop-blur-[18px]');
        expect(markup).toContain('Neuer Lead');
        // Der Umschalter ist weg — der Entwurf hat keinen.
        expect(markup).not.toContain('Zu hellem Design');
        // Das Logo muss im Build liegen, nicht nur im Markup.
        expect(
            existsSync(join(DIST, 'partsunion-symbol-weiss.png')),
            'partsunion-symbol-weiss.png fehlt im Build — das Markup zeigt dann ein defektes Bild',
        ).toBe(true);
    });

    /**
     * Das Dashboard wird CLIENTSEITIG gerendert, nicht über
     * renderToStaticMarkup.
     *
     * Es lädt seine Leads in einem Effekt. Statisch gerendert liefen die
     * Effekte nie, und die Probe hätte den Leerzustand gezeigt — genau das
     * Bild, das nichts beweist. Mit testing-library in jsdom laufen sie, und
     * `waitFor` wartet, bis die Zahlen da sind.
     */
    it.skipIf(!css)('schreibt das Dashboard nach dist-probe/', async () => {
        const { container } = render(
            <div className="flex h-screen h-dvh w-full overflow-hidden bg-canvas text-text-primary" data-workspace="crm">
                <Sidebar activeView="dashboard" onNavigate={() => {}} mobileOpen={false} onMobileOpenChange={() => {}} />
                <div className="flex min-w-0 flex-1 flex-col">
                    <Topbar title="Arbeitsübersicht" user={NUTZER} onOpenMobileSidebar={() => {}} onOpenPalette={() => {}} onRefresh={() => {}} onNewLead={() => {}} onLogout={() => {}} />
                    <main className="flex-1 overflow-auto"><Dashboard /></main>
                </div>
            </div>,
        );
        await waitFor(() => {
            expect(container.querySelector('h1')?.textContent ?? '').toBe('Arbeitsübersicht');
            expect(container.textContent).toContain('Autoteile 7 GmbH');
            expect(container.textContent).not.toContain('Arbeitsliste wird geladen');
        });

        const markup = container.innerHTML;

        mkdirSync(AUSGABE, { recursive: true });
        beiwerkKopieren();
        writeFileSync(
            join(AUSGABE, 'dashboard.html'),
            seite('Probe — CRM Dashboard', css!, markup,
                // Die Einblend-Animation (Reveal/Item, framer-motion) friert im
                // Schnappschuss bei `opacity:0; translateY(12px)` ein — die
                // Kennzahlenkarten und "Neueste Leads" wären im Bild leer, obwohl
                // sie im Markup stehen. Hier wird der ENDZUSTAND erzwungen; das
                // ist derselbe, den man im Browser nach 0,2 s sieht.
                `[style*="opacity: 0"] { opacity: 1 !important; transform: none !important; }`),
            'utf8',
        );

        // Dieselbe Seite hell: data-theme="light" kippt den Tokensatz. Ohne ein
        // Bild davon bliebe „es gibt einen Hellmodus" eine Behauptung.
        writeFileSync(
            join(AUSGABE, 'dashboard-hell.html'),
            seite('Probe — CRM Dashboard hell', css!, markup,
                `[style*="opacity: 0"] { opacity: 1 !important; transform: none !important; }`)
                .replace('data-theme="dark"', 'data-theme="light"'),
            'utf8',
        );

        const text = container.textContent ?? '';
        // Die Sätze richten sich nach den Zahlen, statt fest zu stehen.
        expect(text).toContain('Wiedervorlagen fällig');
        expect(text).toContain('Ohne nächsten Schritt');
        // Und die Abschnitte des Entwurfs sind da.
        for (const abschnitt of ['Pipeline-Bestand', 'Termine heute', 'Datenqualität', 'Nächste Schritte']) {
            expect(text, `Abschnitt "${abschnitt}" fehlt`).toContain(abschnitt);
        }
    });

    it.skipIf(!css).each(['pipeline', 'leads', 'kalender'] as const)('schreibt die Arbeitsansicht %s mit geladenen Daten', async (view) => {
        vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} }));
        const { container, unmount } = render(
            <div className="flex h-screen h-dvh w-full overflow-hidden bg-canvas text-text-primary" data-workspace="crm">
                <Sidebar activeView={view} onNavigate={() => {}} mobileOpen={false} onMobileOpenChange={() => {}} />
                <div className="flex min-w-0 flex-1 flex-col">
                    <Topbar title={view === 'pipeline' ? 'Pipeline' : view === 'kalender' ? 'Kalender' : 'Leads'} user={NUTZER} onOpenMobileSidebar={() => {}} onOpenPalette={() => {}} onRefresh={() => {}} onNewLead={() => {}} onLogout={() => {}} />
                    <main className="min-h-0 min-w-0 flex-1 overflow-auto">{view === 'pipeline' ? <PipelineView /> : view === 'kalender' ? <KalenderView /> : <LeadsView />}</main>
                </div>
            </div>,
        );
        await waitFor(() => {
            expect(container.textContent).toContain(view === 'kalender' ? 'Autoteile Nord GmbH' : 'Autoteile 1 GmbH');
            expect(container.textContent).not.toContain('werden geladen');
            if (view === 'kalender') expect(container.querySelector('[aria-label="Kalenderlage im sichtbaren Zeitraum"]')).not.toBeNull();
        });
        mkdirSync(AUSGABE, { recursive: true });
        beiwerkKopieren();
        // Preserve live select state, which innerHTML does not serialize itself.
        container.querySelectorAll('select').forEach(select => {
            Array.from(select.options).forEach(option => option.toggleAttribute('selected', option.selected));
        });
        writeFileSync(join(AUSGABE, `${view}.html`), seite(`Probe — CRM ${view}`, css!, container.innerHTML), 'utf8');
        unmount();
    });

    it.skipIf(!css)('enthält für jede benutzte Klasse eine Regel in der CSS', () => {
        // A prefix match against .border-border-subtle must not hide a missing
        // .border-border utility (which otherwise falls back to text color).
        expect(css).toMatch(/\.border-border\s*\{\s*border-color:\s*var\(--border\)/);
        const markup = renderToStaticMarkup(
            <div>
                <Sidebar activeView="leads" onNavigate={() => {}} mobileOpen={false} onMobileOpenChange={() => {}} />
                <Topbar
                    title="Leads"
                    user={NUTZER}
                    onOpenMobileSidebar={() => {}}
                    onOpenPalette={() => {}}
                    onRefresh={() => {}}
                    onNewLead={() => {}}
                    onLogout={() => {}}
                />
            </div>,
        );

        const benutzt = new Set<string>();
        for (const m of markup.matchAll(/class="([^"]+)"/g)) {
            for (const k of m[1].split(/\s+/)) if (k) benutzt.add(k);
        }

        /**
         * Ausgenommen sind Klassen, die NICHT von Tailwind kommen: lucide-react
         * hängt an jedes Symbol `lucide lucide-<name>`, und `animate-slide-in-up`
         * steht in premium.css. Die haben zu Recht keine Utility-Regel und wären
         * hier nur Rauschen, das die Prüfung nutzlos macht.
         */
        const fremd = (k: string) =>
            k === 'lucide' || k.startsWith('lucide-') || k.startsWith('animate-slide');

        /**
         * Klassenname → Selektor, wie er in der CSS steht. Sonderzeichen
         * bekommen einen Backslash; eine FÜHRENDE ZIFFER wird als Hex-Folge
         * maskiert (`2xl:flex` steht als `\32xl\:flex`).
         */
        const maskieren = (k: string) => {
            const rest = k.replace(/([.[\]/(),%:!#])/g, '\\$1');
            return /^\d/.test(k) ? `\\3${rest[0]}${rest.slice(1)}` : rest;
        };

        const ohneRegel = [...benutzt]
            .filter((k) => !fremd(k))
            .filter((k) => !css!.includes(`.${maskieren(k)}`));

        expect(ohneRegel, `Klassen ohne Regel in der gebauten CSS: ${ohneRegel.join(', ')}`)
            .toEqual([]);
    });
});
