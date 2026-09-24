/**
 * Broschüren-Versand — Verfügbarkeitserkennung und Sammelversand.
 *
 * Anlass für den ersten Block: Die Erkennung merkte sich ihr Ergebnis für die
 * ganze Sitzung — auch einen Fehlschlag. Das ist kein theoretischer Fall,
 * sondern genau der Ablauf bei der Einführung:
 *
 *   1. Jemand öffnet das CRM. Die Broschüre ist noch nicht hochgeladen.
 *      -> HEAD schlägt fehl, "gibt es nicht" ist festgeschrieben.
 *   2. Er lädt die Datei im Admin-Dashboard hoch.
 *   3. Er kehrt ins CRM zurück und klickt "Broschüre senden".
 *      -> "Es ist keine Broschüre hinterlegt." Für immer, bis F5.
 *
 * Der zweite Block sichert den Sammelversand: ein Fehler bei einem Lead darf
 * die übrigen nicht aufhalten, und niemand darf am Ende raten müssen, wer nun
 * eine Mail hat und wer nicht.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    buildBrochureEmail,
    brochureVariantForLead,
    sendBrochure,
    sendBrochureBatch,
} from './brochure';
import type { Lead } from './storage';

function lead(over: Partial<Lead> = {}): Lead {
    return {
        id: over.id ?? 'l1',
        company: over.company ?? 'Mueller GmbH',
        email: over.email,
        status: 'Neu',
        createdAt: new Date(0).toISOString(),
        ...over,
    } as Lead;
}

const urspruenglich = globalThis.fetch;

beforeEach(() => {
    vi.useRealTimers();
});

afterEach(() => {
    globalThis.fetch = urspruenglich;
    vi.restoreAllMocks();
});

describe('sendBrochureBatch', () => {
    it('zählt Leads ohne Adresse getrennt und verschickt nichts an sie', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true, json: async () => ({ success: true, messageId: 'm' }),
        }) as unknown as typeof fetch;

        const r = await sendBrochureBatch([
            lead({ id: 'a', email: 'a@b.de' }),
            lead({ id: 'b', email: undefined }),
            lead({ id: 'c', email: '   ' }),
        ]);

        expect(r.ohneAdresse).toBe(2);
        expect(r.gesendet).toBe(1);
        expect(r.fehler).toEqual([]);
    });

    it('macht nach einem Fehlschlag weiter und benennt den betroffenen Lead', async () => {
        // Ohne das hinge nach dem zweiten von fünfzig Leads alles, und niemand
        // wüsste, wer schon eine Mail bekommen hat.
        let n = 0;
        globalThis.fetch = vi.fn(async (url: unknown, init?: unknown) => {
            const istVersand = Boolean((init as { method?: string })?.method === 'POST');
            if (!istVersand) return { ok: true };            // HEAD-Prüfung
            n += 1;
            if (n === 2) return { ok: false, json: async () => ({ error: 'Adresse abgelehnt' }) };
            return { ok: true, json: async () => ({ success: true, messageId: 'm' }) };
        }) as unknown as typeof fetch;

        const r = await sendBrochureBatch([
            lead({ id: 'a', company: 'Erste GmbH', email: 'a@b.de' }),
            lead({ id: 'b', company: 'Zweite GmbH', email: 'b@b.de' }),
            lead({ id: 'c', company: 'Dritte GmbH', email: 'c@b.de' }),
        ]);

        expect(r.gesendet).toBe(2);
        expect(r.fehler).toHaveLength(1);
        expect(r.fehler[0].lead).toBe('Zweite GmbH');
        expect(r.fehler[0].grund).toBe('Adresse abgelehnt');
    });

    it('meldet den Fortschritt für jeden Lead mit Adresse', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true, json: async () => ({ success: true, messageId: 'm' }),
        }) as unknown as typeof fetch;

        const schritte: Array<[number, number]> = [];
        await sendBrochureBatch(
            [lead({ id: 'a', email: 'a@b.de' }), lead({ id: 'b', email: 'b@b.de' })],
            (fertig, gesamt) => schritte.push([fertig, gesamt]),
        );

        expect(schritte).toEqual([[1, 2], [2, 2]]);
    });
});

describe('Broschüren-Mail', () => {
    it('beschreibt das feste Produkt ehrlich und nennt alles in einer App', () => {
        const mail = buildBrochureEmail(lead({ email: 'kunde@betrieb.de' }));
        expect(mail.subject).toContain('Eine Anfrage. Ein Vorgang.');
        expect(mail.text).toContain('festes Partsunion-System');
        expect(mail.text).toContain('alles\nin einer App');
    });

    it('delegiert Empfänger und freigegebene PDF-Auswahl an den CRM-Endpunkt', async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, messageId: 'm1' }) });
        globalThis.fetch = fetchMock as unknown as typeof fetch;

        await sendBrochure(lead({ email: 'kunde@betrieb.de' }));
        const body = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body));
        expect(fetchMock.mock.calls[0][0]).toContain('/api/crm/leads/l1/brochure');
        expect(Object.keys(body)).toEqual(['requestId']);
        expect(body.requestId).toMatch(/^[a-f0-9-]{36}$/);
    });

    it('wählt für Frankreich eine französische Mail und PDF', async () => {
        expect(brochureVariantForLead(lead({ country: 'FR' }))).toMatchObject({
            locale: 'fr', slug: 'broschuere-fr',
        });
        const mail = buildBrochureEmail(lead({ country: 'France', contactPerson: 'Madame Martin' }));
        expect(mail.subject).toContain('une demande');
        expect(mail.text).toContain('une seule application');

        const fetchMock = vi.fn().mockResolvedValue({
            ok: true, json: async () => ({ success: true, messageId: 'm-fr' }),
        });
        globalThis.fetch = fetchMock as unknown as typeof fetch;
        await sendBrochure(lead({ country: 'FR', email: 'client@exemple.fr' }));
        const body = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body));
        expect(Object.keys(body)).toEqual(['requestId']);
    });

    it.each(['DE', 'AT', 'CH', 'Deutschland', 'Österreich', 'Schweiz'])(
        'nutzt für %s die deutsche Fassung',
        (country) => expect(brochureVariantForLead(lead({ country }))).toMatchObject({
            locale: 'de', slug: 'broschuere',
        }),
    );
    it('verwendet nach unklarem Versand dieselbe Anfrage und sendet keine frei gewählten Inhalte', async () => {
        const fetchMock = vi.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, messageId: 'm-retry', recipient: 'kunde@example.de' }) });
        globalThis.fetch = fetchMock as unknown as typeof fetch;
        const item = lead({ id: 'retry', email: 'kunde@example.de' });
        await expect(sendBrochure(item)).rejects.toThrow('Versandstatus unklar');
        await expect(sendBrochure(item)).resolves.toMatchObject({ messageId: 'm-retry' });
        const first = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body));
        const second = JSON.parse(String((fetchMock.mock.calls[1][1] as RequestInit).body));
        expect(first).toEqual(second);
    });
});
