import type { ViewId } from '../components/layout/Sidebar';

export const VIEW_PATHS: Record<ViewId, string> = { dashboard: '/', leads: '/leads', pipeline: '/pipeline', scraper: '/sources', reports: '/reports', kalender: '/calendar', settings: '/settings', security: '/account/security', users: '/team', pipelineSettings: '/settings/pipeline' };
export function viewFromPath(path: string): ViewId { return (Object.keys(VIEW_PATHS) as ViewId[]).find((view) => VIEW_PATHS[view] === path.replace(/\/$/, '') || (path === '/' && view === 'dashboard')) || 'dashboard'; }
