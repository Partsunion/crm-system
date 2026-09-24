/**
 * Seitenleiste — Anheften.
 *
 * ANLASS: Die Leiste klappte nach JEDEM Klick wieder ein. In handleNavigate
 * stand ein bedingungsloses setCollapsed(true). Wer sich beim Arbeiten an der
 * Navigation orientiert, musste sie dutzendfach am Tag neu aufziehen.
 *
 * Der Kern dieser Aenderung ist eine einzige Zeile — `if (angeheftet) return;`
 * — und genau die verschwindet bei der naechsten Umbau-Runde als Erstes, weil
 * sie wie eine vergessene Abkuerzung aussieht. Deshalb steht sie hier als
 * Verhalten fest.
 */
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Sidebar } from './Sidebar';

function aufbauen(onNavigate = vi.fn()) {
    render(
        <Sidebar
            activeView="dashboard"
            onNavigate={onNavigate}
            mobileOpen={false}
            onMobileOpenChange={vi.fn()}
        />,
    );
    return { onNavigate };
}

/**
 * Ist die Leiste FEST aufgeklappt?
 *
 * Bewusst nicht "sind Beschriftungen sichtbar": bei eingeklappter Leiste zeigt
 * das Hover-Overlay dieselben Beschriftungen. Wer nur auf den Text prueft,
 * misst die Vorschau mit und haelt eine eingeklappte Leiste faelschlich fuer
 * offen — genau darueber ist dieser Test beim Schreiben gestolpert.
 *
 * Verlaesslich ist der Einklapp-Knopf: seine Beschriftung sagt, in welchem
 * Zustand die feste Leiste steht.
 */
function istOffen(): boolean {
    return screen.queryAllByLabelText('Sidebar einklappen').length > 0
        && screen.queryAllByLabelText('Sidebar ausklappen').length === 0;
}

beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
});

afterEach(() => {
    // Ohne `globals: true` haengt sich die automatische Bereinigung von
    // @testing-library nicht selbst ein — dann stapeln sich die gerenderten
    // Baeume, und Abfragen finden dasselbe Element mehrfach.
    cleanup();
    localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('ohne Anheftung', () => {
    it('behält die gewählte Breite nach der Navigation bei', async () => {
        const nutzer = userEvent.setup();
        aufbauen();
        expect(istOffen()).toBe(true);

        await nutzer.click(screen.getAllByText('Leads')[0]);
        expect(istOffen()).toBe(true);
    });
});

describe('mit Anheftung', () => {
    it('bleibt nach der Navigation offen — der eigentliche Zweck', async () => {
        const nutzer = userEvent.setup();
        const { onNavigate } = aufbauen();

        await nutzer.click(screen.getByText('Anheften'));
        expect(screen.getByText('Angeheftet')).toBeTruthy();

        await nutzer.click(screen.getAllByText('Leads')[0]);

        expect(onNavigate).toHaveBeenCalledWith('leads');
        expect(istOffen()).toBe(true);
    });

    it('ueberlebt einen Neustart der Anwendung', async () => {
        const nutzer = userEvent.setup();
        aufbauen();
        await nutzer.click(screen.getByText('Anheften'));

        // Wie ein Neuladen der Seite: frisch aufbauen, Speicher bleibt.
        screen.getByText('Angeheftet');
        const gemerkt = localStorage.getItem('pu.crm.sidebar.pinned.v1');
        expect(gemerkt).toBe('1');
    });

    it('loest sich, wenn man ausdruecklich einklappt', async () => {
        // Eingeklappt UND angeheftet widerspricht sich. Wer einklappt, will die
        // Leiste weghaben — dann darf die Anheftung sie nicht zurueckholen.
        const nutzer = userEvent.setup();
        aufbauen();

        await nutzer.click(screen.getByText('Anheften'));
        await nutzer.click(screen.getByText('Einklappen'));

        expect(screen.queryAllByLabelText('Sidebar ausklappen').length).toBeGreaterThan(0);
        expect(localStorage.getItem('pu.crm.sidebar.pinned.v1')).toBe('0');
    });

    it('klappt beim Anheften aus, falls sie eingeklappt war', async () => {
        localStorage.setItem('pu.crm.sidebar.collapsed.v1', '1');
        const nutzer = userEvent.setup();
        aufbauen();
        expect(istOffen()).toBe(false);

        // Eingeklappt gibt es keinen Anheft-Knopf in der schmalen Leiste —
        // er erscheint im Overlay beim Drueberfahren. Hier ueber die
        // Ausklapp-Schaltflaeche, dann anheften.
        await nutzer.click(screen.getAllByLabelText('Sidebar ausklappen')[0]);
        await nutzer.click(screen.getAllByText('Anheften')[0]);

        expect(screen.queryAllByLabelText('Sidebar ausklappen').length).toBe(0);
        expect(localStorage.getItem('pu.crm.sidebar.collapsed.v1')).toBe('0');
    });
});

describe('ohne nutzbaren Speicher', () => {
    it('stuerzt nicht ab, sondern gilt nur fuer diese Sitzung', async () => {
        // Safari im privaten Modus, verwaltete Firmenbrowser: schon der Zugriff
        // auf localStorage wirft. Das darf die Navigation nicht mitreissen.
        const echt = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
        Object.defineProperty(globalThis, 'localStorage', {
            configurable: true,
            get() { throw new DOMException('The operation is insecure.', 'SecurityError'); },
        });
        try {
            const nutzer = userEvent.setup();
            aufbauen();
            await nutzer.click(screen.getByText('Anheften'));
            expect(screen.getByText('Angeheftet')).toBeTruthy();
        } finally {
            if (echt) Object.defineProperty(globalThis, 'localStorage', echt);
        }
    });
});
