/**
 * Der Zwischenspeicher — und vor allem die Fälle, in denen er schaden würde.
 *
 * Ein Zwischenspeicher ist leicht zu bauen und leicht falsch zu bauen. Die
 * Prüfungen hier sind nach dem sortiert, was beim Bauen wirklich schiefging
 * oder beinahe schiefgegangen wäre — nicht nach dem, was leicht zu prüfen ist.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { merken, vergessen, vergessenMitPraefix, SCHLUESSEL } from '../app/utils/zwischenspeicher';

beforeEach(() => {
    vergessen();
    vi.useRealTimers();
});

describe('Zwischenspeicher', () => {
    it('holt beim zweiten Mal nicht erneut', async () => {
        const laden = vi.fn().mockResolvedValue(['a']);
        expect(await merken('k', laden)).toEqual(['a']);
        expect(await merken('k', laden)).toEqual(['a']);
        expect(laden).toHaveBeenCalledTimes(1);
    });

    it('zwei gleichzeitige Anfragen teilen sich EINE Abfrage', async () => {
        // React fuehrt Effekte im Entwicklungsmodus absichtlich doppelt aus.
        // Ohne diese Zusammenfuehrung waeren das zwei Anfragen ueber 405 KB.
        let aufloesen: (w: string[]) => void = () => {};
        const laden = vi.fn(() => new Promise<string[]>((r) => { aufloesen = r; }));
        const beide = Promise.all([merken('k', laden), merken('k', laden)]);
        aufloesen(['a']);
        expect(await beide).toEqual([['a'], ['a']]);
        expect(laden).toHaveBeenCalledTimes(1);
    });

    it('merkt sich einen Fehlschlag NICHT', async () => {
        // Sonst haengt man nach einem kurzen Netzaussetzer eine Minute an
        // der leeren Liste fest, obwohl laengst wieder alles erreichbar ist.
        const laden = vi.fn()
            .mockRejectedValueOnce(new Error('Netz weg'))
            .mockResolvedValueOnce(['a']);
        await expect(merken('k', laden)).rejects.toThrow('Netz weg');
        expect(await merken('k', laden)).toEqual(['a']);
        expect(laden).toHaveBeenCalledTimes(2);
    });

    it('vergisst nach Ablauf der Haltbarkeit', async () => {
        vi.useFakeTimers();
        const laden = vi.fn().mockResolvedValue(['a']);
        await merken('k', laden);
        vi.advanceTimersByTime(61_000);
        await merken('k', laden);
        expect(laden).toHaveBeenCalledTimes(2);
    });

    it('vergessen(schluessel) trifft nur diesen einen', async () => {
        const a = vi.fn().mockResolvedValue(1);
        const b = vi.fn().mockResolvedValue(2);
        await merken('a', a);
        await merken('b', b);
        vergessen('a');
        await merken('a', a);
        await merken('b', b);
        expect(a).toHaveBeenCalledTimes(2);
        expect(b).toHaveBeenCalledTimes(1);
    });

    it('vergessenMitPraefix raeumt alle Zeitraeume der Termine ab', async () => {
        // Ein Termin, der ueber eine Monatsgrenze verschoben wird, erschiene
        // sonst doppelt: im alten Monat noch, im neuen schon.
        const laden = vi.fn().mockResolvedValue([]);
        await merken(SCHLUESSEL.termine('?from=2026-08-01'), laden);
        await merken(SCHLUESSEL.termine('?from=2026-09-01'), laden);
        await merken(SCHLUESSEL.leads, laden);
        vergessenMitPraefix('termine:');
        await merken(SCHLUESSEL.termine('?from=2026-08-01'), laden);
        await merken(SCHLUESSEL.termine('?from=2026-09-01'), laden);
        await merken(SCHLUESSEL.leads, laden);
        // 3 Erstabrufe + 2 erneute Terminabrufe; die Leads bleiben gemerkt.
        expect(laden).toHaveBeenCalledTimes(5);
    });
});
