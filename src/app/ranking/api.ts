import { authHeaders } from '../utils/storage';
export type RankingPeriod = 'week' | 'month';
export interface RankingRow {
  id: string; name: string; active: boolean; rank: number | null; points: number;
  numbers: number; appointments: number; brochures: number; salesCalls: number; deals: number;
}
export interface RankingReport {
  period: RankingPeriod; start: string; end: string; today: string; launchedWeek: string;
  timezone: string; updatedAt: string; scoringVersion: number;
  weights: { numbers: number; appointments: number; brochures: number; salesCalls: number; deals: number };
  rows: RankingRow[];
  history: { start: string; end: string; current: boolean; rows: RankingRow[] }[];
  firstWeekPause: { start: string; end: string; users: { id: string; name: string }[] };
}

export async function loadRanking(period: RankingPeriod, date?: string): Promise<RankingReport> {
  const query = new URLSearchParams({ period, ...(date ? { date } : {}) });
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'https://api.partsunion.de'}/api/crm/ranking?${query}`, {
    credentials: 'include', cache: 'no-store', headers: authHeaders(), signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error('Die Rangliste konnte nicht geladen werden.');
  return response.json();
}
