/**
 * Sitzungsspeicher — Verhalten, wenn der Browser keinen hergibt.
 *
 * Der Zugriff auf localStorage ist NICHT verlässlich. In Safaris privatem
 * Modus, bei blockierten Website-Daten und in verwalteten Firmenbrowsern wirft
 * schon das blosse Lesen der Eigenschaft einen SecurityError.
 *
 * Vorher genügte das, um die gesamte Anwendung lahmzulegen: getToken() warf,
 * damit warf jeder API-Aufruf, und der Nutzer sah eine leere Seite ohne
 * Erklärung. Beim Broschüren-Versand kam der Fehler als "0 gesendet" an — also
 * als scheinbarer Fachfehler statt als das, was er war.
 *
 * Richtig ist: kein Speicher bedeutet "nicht angemeldet". Ein Anmeldebildschirm
 * ist eine Antwort, ein Absturz ist keine.
 *
 * Dieselbe Fehlerklasse steckte im Admin-Dashboard in impersonationSession.ts.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getCurrentUser, getToken, logout } from './storage';

/** Ersetzt einen Speicher durch einen, der bei jedem Zugriff wirft. */
function speicherSperren(name: 'localStorage' | 'sessionStorage'): void {
    Object.defineProperty(globalThis, name, {
        configurable: true,
        get() {
            throw new DOMException('The operation is insecure.', 'SecurityError');
        },
    });
}

const echt = {
    localStorage: Object.getOwnPropertyDescriptor(globalThis, 'localStorage'),
    sessionStorage: Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage'),
};
beforeEach(() => { vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true })); });

afterEach(() => {
    for (const [name, d] of Object.entries(echt)) {
        if (d) Object.defineProperty(globalThis, name, d);
    }
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('bei gesperrtem Speicher', () => {
    it('liefert getToken() null statt zu werfen', () => {
        speicherSperren('localStorage');
        speicherSperren('sessionStorage');
        expect(() => getToken()).not.toThrow();
        expect(getToken()).toBeNull();
    });

    it('liefert getCurrentUser() null statt zu werfen', () => {
        speicherSperren('localStorage');
        speicherSperren('sessionStorage');
        expect(() => getCurrentUser()).not.toThrow();
        expect(getCurrentUser()).toBeNull();
    });

    it('laesst sich abmelden, ohne zu werfen', () => {
        speicherSperren('localStorage');
        speicherSperren('sessionStorage');
        expect(() => logout()).not.toThrow();
    });

    it('kommt auch damit zurecht, dass nur localStorage gesperrt ist', () => {
        // Genau diese Mischung tritt real auf: sessionStorage erlaubt,
        // localStorage durch Richtlinie blockiert.
        speicherSperren('localStorage');
        expect(() => getToken()).not.toThrow();
        expect(() => logout()).not.toThrow();
    });
});

describe('bei beschaedigtem Eintrag', () => {
    it('liefert getCurrentUser() null statt an JSON.parse zu scheitern', () => {
        // Halb geschriebener Eintrag oder Format aus einer aelteren Fassung.
        sessionStorage.setItem('haendler_crm_current_user', '{kaputt');
        expect(() => getCurrentUser()).not.toThrow();
        expect(getCurrentUser()).toBeNull();
        sessionStorage.removeItem('haendler_crm_current_user');
    });
});
