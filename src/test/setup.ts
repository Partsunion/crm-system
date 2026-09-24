/**
 * Testumgebung — was jsdom nicht mitbringt.
 *
 * jsdom stellt in dieser Fassung `sessionStorage` bereit, `localStorage` aber
 * NICHT. Nachgemessen: `typeof sessionStorage === 'object'`,
 * `typeof localStorage === 'undefined'`.
 *
 * Ohne Ersatz schlagen alle Tests fehl, die Einstellungen ueber Neuladen hinweg
 * pruefen — und zwar mit "Cannot read properties of undefined", also wie ein
 * Fehler im Code statt wie eine fehlende Umgebung. Genau diese Verwechslung
 * kostet die meiste Zeit.
 *
 * Im Browser gibt es localStorage immer; das hier gleicht nur den Prueftisch
 * an, es aendert nichts am Verhalten der Anwendung. Der Fall "Browser gibt
 * keinen Speicher her" wird weiterhin ausdruecklich geprueft — dort ersetzen
 * die Tests den Zugriff durch einen, der wirft (storage.test.ts).
 */

class SpeicherErsatz implements Storage {
    private daten = new Map<string, string>();

    get length(): number {
        return this.daten.size;
    }

    clear(): void {
        this.daten.clear();
    }

    getItem(key: string): string | null {
        return this.daten.has(key) ? (this.daten.get(key) as string) : null;
    }

    key(index: number): string | null {
        return Array.from(this.daten.keys())[index] ?? null;
    }

    removeItem(key: string): void {
        this.daten.delete(key);
    }

    setItem(key: string, value: string): void {
        this.daten.set(key, String(value));
    }
}

for (const name of ['localStorage', 'sessionStorage'] as const) {
    let vorhanden = false;
    try {
        vorhanden = typeof (globalThis as Record<string, unknown>)[name] === 'object'
            && (globalThis as Record<string, unknown>)[name] !== null;
    } catch {
        vorhanden = false;
    }
    if (!vorhanden) {
        Object.defineProperty(globalThis, name, {
            configurable: true,
            writable: true,
            value: new SpeicherErsatz(),
        });
    }
}
