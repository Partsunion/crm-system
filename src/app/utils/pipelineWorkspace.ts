import type { Lead, PipelineStage } from './storage';
import { stageAgeDays, stageCategory } from './stages';
import { timestamp } from './leadQuality';

export type PipelineFocus = 'all' | 'due' | 'no_next_step' | 'stalled';

/** Group once per data/filter change. Unmapped leads remain explicitly visible. */
export function pipelineWorkspace(leads: Lead[], stages: PipelineStage[], assignee: string, focus: PipelineFocus, today: string, now = Date.now()) {
  const byId = new Map(stages.map(stage => [stage.id, stage]));
  const byName = new Map(stages.map(stage => [stage.name, stage]));
  const groups = new Map(stages.map(stage => [stage.id, { leads: [] as Lead[], value: 0 }]));
  const unmapped: Lead[] = [];
  let open = 0, openValue = 0, due = 0, noNextStep = 0, stalled = 0, weightedValue = 0, weightedCoverage = 0;
  for (const lead of leads) {
    if (assignee !== 'all' && (assignee === 'unassigned' ? Boolean(lead.assignedTo) : lead.assignedTo !== assignee)) continue;
    const stage = (lead.stageId ? byId.get(lead.stageId) : undefined) ?? byName.get(lead.status);
    const isOpen = !!stage && stageCategory(stage) === 'open';
    const hasNext = timestamp(lead.nextFollowUpDate) > 0;
    const isDue = isOpen && hasNext && lead.nextFollowUpDate!.slice(0, 10) <= today;
    const missingNext = isOpen && !hasNext;
    const isStalled = isOpen && (stageAgeDays(lead, now) ?? 0) >= 14;
    const value = Number.isFinite(lead.value) ? lead.value! : 0;
    if (isOpen) {
      open++; openValue += value;
      if (typeof stage.probability === 'number') {
        weightedValue += value * Math.max(0, Math.min(100, stage.probability)) / 100;
        weightedCoverage++;
      }
    }
    if (isDue) due++;
    if (missingNext) noNextStep++;
    if (isStalled) stalled++;
    // Do not silently hide data with deleted/inactive/unknown phases.
    if (!stage) { unmapped.push(lead); continue; }
    if ((focus === 'due' && !isDue) || (focus === 'no_next_step' && !missingNext) || (focus === 'stalled' && !isStalled)) continue;
    const group = groups.get(stage.id)!;
    group.leads.push(lead);
    group.value += value;
  }
  return { groups, unmapped, open, openValue, due, noNextStep, stalled, weightedValue, weightedCoverage };
}
