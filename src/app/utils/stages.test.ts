import { describe, expect, it, vi } from 'vitest';
import { defaultOpenStage, leadCategory, stageAgeDays, stageCategory } from './stages';
vi.mock('./storage', () => ({ getSettings: () => ({ pipelineStages: [{ id: 'won', name: 'Kunde', category: 'won', isActive: true, order: 2 }, { id: 'open', name: 'Eingang', category: 'open', isActive: true, order: 1 }] }) }));
describe('stable phase semantics', () => {
  it('classifies renamed phases by ID and server category', () => { expect(leadCategory({ stageId: 'won', status: 'Kunde' })).toBe('won'); expect(leadCategory({ status: 'Gewonnen', stageCategory: 'open' })).toBe('open'); });
  it('falls back only for legacy data and chooses a real active open phase', () => { expect(stageCategory({ name: 'Verloren' })).toBe('lost'); expect(defaultOpenStage()).toBe('Eingang'); });
  it('does not invent stage age for records lacking history', () => { expect(stageAgeDays({})).toBeNull(); expect(stageAgeDays({ stageEnteredAt: '2026-09-01T10:00:00Z' }, Date.parse('2026-09-04T10:00:00Z'))).toBe(3); });
});
