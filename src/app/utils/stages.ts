import { getSettings, type Lead, type PipelineStage } from './storage';

export type StageCategory = 'open' | 'won' | 'lost';
/** Stable server categories take precedence; names only support old data during rollout. */
export function stageCategory(stage?: Pick<PipelineStage, 'name' | 'category'>): StageCategory {
  return stage?.category || (stage?.name === 'Gewonnen' ? 'won' : stage?.name === 'Verloren' ? 'lost' : 'open');
}
export function leadCategory(lead: Pick<Lead, 'status' | 'stageId' | 'stageCategory'>): StageCategory {
  return lead.stageCategory || stageCategory(getSettings().pipelineStages.find((stage) => lead.stageId ? stage.id === lead.stageId : stage.name === lead.status) || { name: lead.status });
}
export function defaultOpenStage(): string { return getSettings().pipelineStages.filter((stage) => stage.isActive && stageCategory(stage) === 'open').sort((a, b) => a.order - b.order)[0]?.name || 'Neu'; }
export function stageAgeDays(lead: Pick<Lead, 'stageEnteredAt'>, now = Date.now()): number | null {
  const start = Date.parse(lead.stageEnteredAt || '');
  return Number.isFinite(start) ? Math.max(0, Math.floor((now - start) / 864e5)) : null;
}
