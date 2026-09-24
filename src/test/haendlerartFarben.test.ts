import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const THEME = readFileSync('src/styles/theme.css', 'utf8');
const UI_KIT = readFileSync('src/app/components/ui-kit.tsx', 'utf8');
const LEADS = readFileSync('src/app/components/LeadsView.tsx', 'utf8');

describe('Händlerart-Farben', () => {
    it('verwendet für Gebrauchtteile in Hell und Dunkel denselben Orangeton', () => {
        const values = [...THEME.matchAll(/--dealer-used:\s*(#[0-9A-Fa-f]{6})/g)].map((match) => match[1]);
        expect(values).toHaveLength(2);
        expect(new Set(values).size).toBe(1);
        expect(values[0]?.toUpperCase()).toBe('#F28A2B');
    });

    it('trennt Händlerart semantisch vom Warnstatus', () => {
        expect(UI_KIT).toContain("used: 'bg-dealer-used text-dealer-used-foreground'");
        expect(LEADS).toContain("? 'used' : lead.dealerType === 'neuteile' ? 'accent' : 'neutral'");
    });
});
