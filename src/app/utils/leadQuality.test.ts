import { describe, expect, it } from 'vitest';
import { matchesQuality, matchesQualitySnapshot, qualityOf, timestamp, type QualityFilter } from './leadQuality';
import type { Lead } from './storage';

const lead: Lead = { id: '1', company: 'Teile Müller', contactPerson: 'M. Müller', email: 'info@example.de', phone: '', status: 'Neu', source: 'Empfehlung', dealerType: 'neuteile', city: 'Berlin', tags: [], createdAt: '2026-09-01', updatedAt: '2026-09-01' };
describe('explainable lead quality', () => {
  it('reuses cached assessments without changing any filter result', () => {
    const now = Date.parse('2026-09-05');
    for (const item of [lead, { ...lead, email: '', contactPerson: '', nextFollowUpDate: 'invalid' }]) {
      for (const filter of ['all', 'complete', 'no_contact', 'missing_person', 'no_next_step', 'stale'] as QualityFilter[]) {
        expect(matchesQualitySnapshot(qualityOf(item, now), filter)).toBe(matchesQuality(item, filter, now));
      }
    }
  });
  it('counts source fields and does not use legacy scores as evidence', () => {
    expect(qualityOf({ ...lead, leadScore: 1 }).complete).toBe(6);
    expect(qualityOf({ ...lead, contactPerson: '', email: 'nicht gefunden', leadScore: 100 }).missing).toEqual(['Kontaktweg', 'Ansprechpartner']);
    expect(qualityOf(lead).explanation).toContain('nicht extern verifiziert');
  });
  it('treats absent contact, no next action and stale records independently', () => {
    expect(matchesQuality(lead, 'no_contact')).toBe(false);
    expect(matchesQuality(lead, 'no_next_step')).toBe(true);
    expect(matchesQuality(lead, 'stale', Date.parse('2026-09-04'))).toBe(false);
    expect(matchesQuality(lead, 'stale', Date.parse('2027-01-01'))).toBe(true);
  });
  it('never returns NaN for missing or invalid dates', () => {
    expect(timestamp(undefined)).toBe(0); expect(timestamp('invalid')).toBe(0);
  });
  it('does not call a recently updated lead stale because its last call was older', () => {
    expect(qualityOf({ ...lead, lastContactDate: '2025-01-01' }, Date.parse('2026-09-04')).stale).toBe(false);
    expect(matchesQuality({ ...lead, nextFollowUpDate: 'not a date' }, 'no_next_step')).toBe(true);
  });
});
