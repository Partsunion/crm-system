import { describe, expect, it } from 'vitest';
import type { Lead } from '../utils/storage';
import { SOURCE_SEGMENTS } from './LeadsView';

const lead = (source: string, leadSource?: string): Lead => ({
  id: source,
  company: source,
  contactPerson: '',
  email: '',
  status: 'Neu',
  source,
  leadSource,
  tags: [],
  createdAt: '',
  updatedAt: '',
});

describe('feste Quellenfilter', () => {
  const segment = (key: string) => SOURCE_SEGMENTS.find((item) => item.key === key)!;

  it('zeigt ausschließlich die vereinbarten sechs Quellen', () => {
    expect(SOURCE_SEGMENTS.map((item) => item.label)).toEqual([
      'Alle', 'Scraping', 'Website', 'GoogleAds', 'MetaAds', 'Manuell',
    ]);
  });

  it('trennt Werbe-Leads von allgemeinen Social- und Website-Daten', () => {
    expect(segment('src:website').match(lead('Website Formular'))).toBe(true);
    expect(segment('src:google').match(lead('Google Ads'))).toBe(true);
    expect(segment('src:meta').match(lead('Meta Leads'))).toBe(true);
    expect(segment('src:meta').match(lead('WhatsApp'))).toBe(false);
    expect(segment('src:website').match(lead('Empfehlung', 'website'))).toBe(true);
    expect(segment('src:manual').match(lead('Manuell'))).toBe(true);
  });
});
