import { describe, expect, it } from 'vitest';
import { pipelineWorkspace } from './pipelineWorkspace';
import type { Lead, PipelineStage } from './storage';

const stages: PipelineStage[] = [
  { id: 'open', name: 'Neu', category: 'open', order: 0, isActive: true, probability: 10, color: '#194bf0' },
  { id: 'won', name: 'Gewonnen', category: 'won', order: 1, isActive: true, probability: 100, color: '#067640' },
];
const lead = (id: string, patch: Partial<Lead> = {}): Lead => ({
  id, company: id, contactPerson: '', email: '', status: 'Neu', priority: 'Mittel', source: 'Manuell',
  value: 100, tags: [], createdAt: '2026-09-01', updatedAt: '2026-09-01', ...patch,
});
const leads = [
  lead('today', { nextFollowUpDate: '2026-09-05', assignedTo: 'Aaron' }),
  lead('future', { nextFollowUpDate: '2026-09-06', assignedTo: 'Aaron', stageEnteredAt: '2026-08-01T10:00:00Z' }),
  lead('missing'), lead('invalid', { nextFollowUpDate: 'not-a-date' }),
  lead('closed', { status: 'Gewonnen', nextFollowUpDate: '2026-09-01', value: 500 }),
  lead('unknown', { status: 'Removed', value: 1000 }),
];
describe('Pipeline workspace', () => {
  it('uses unweighted open values and excludes closed/unknown phases from the work queues', () => {
    const result = pipelineWorkspace(leads, stages, 'all', 'all', '2026-09-05', Date.parse('2026-09-05T12:00:00Z'));
    expect(result).toMatchObject({ open: 4, openValue: 400, due: 1, noNextStep: 2, stalled: 1, weightedValue: 40, weightedCoverage: 4 });
    expect(result.groups.get('won')?.value).toBe(500);
    expect(result.unmapped.map(item => item.id)).toEqual(['unknown']);
  });
  it('shows only open opportunities with an explicit phase age of at least 14 days as stalled', () => {
    const result = pipelineWorkspace(leads, stages, 'all', 'stalled', '2026-09-05', Date.parse('2026-09-05T12:00:00Z'));
    expect(result.groups.get('open')?.leads.map(item => item.id)).toEqual(['future']);
    expect(result.groups.get('won')?.leads).toEqual([]);
  });
  it('filters today and overdue without including future or invalid dates', () => {
    const result = pipelineWorkspace(leads, stages, 'all', 'due', '2026-09-05');
    expect(result.groups.get('open')?.leads.map(item => item.id)).toEqual(['today']);
    expect(result.groups.get('won')?.leads).toEqual([]);
    expect(result.unmapped).toHaveLength(1);
  });
  it('keeps queue counts scoped to the selected assignee, independent of work filter', () => {
    const result = pipelineWorkspace(leads, stages, 'Aaron', 'no_next_step', '2026-09-05');
    expect(result).toMatchObject({ open: 2, due: 1, noNextStep: 0 });
    expect(result.groups.get('open')?.leads).toEqual([]);
    expect(pipelineWorkspace(leads, stages, 'unassigned', 'no_next_step', '2026-09-05').groups.get('open')?.leads.map(item => item.id)).toEqual(['missing', 'invalid']);
  });
  it('uses stable phase IDs after renames and does not mutate source order', () => {
    const data = [lead('renamed', { stageId: 'open', status: 'Old name' })];
    const result = pipelineWorkspace(data, stages, 'all', 'all', '2026-09-05');
    expect(result.groups.get('open')?.leads[0]).toBe(data[0]);
    expect(data[0].status).toBe('Old name');
    expect(result.unmapped).toEqual([]);
  });
});
