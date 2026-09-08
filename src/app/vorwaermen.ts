const views: Record<string, () => Promise<unknown>> = {
  dashboard: () => import('./components/Dashboard'),
  leads: () => import('./components/LeadsView'),
  kalender: () => import('./components/KalenderView'),
  pipeline: () => import('./components/PipelineView'),
  scraper: () => import('./components/ScraperView'),
  reports: () => import('./components/ReportsView'),
  settings: () => import('./components/Settings'),
  users: () => import('./components/UserManagement'),
  pipelineSettings: () => import('./components/PipelineSettings'),
};

/** Fetch on pointer/focus intent; never initialize views or request their data. */
export function ansichtVorwaermen(view: string): void { void views[view]?.().catch(() => {}); }
export function berichteVorwaermen(): void { ansichtVorwaermen('reports'); }

/** Only the two everyday workspaces are prefetched automatically. */
export function ansichtenVorwaermen(): () => void {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || '')) return () => {};
  const browser = window as Window & { requestIdleCallback?: (callback: () => void) => number; cancelIdleCallback?: (id: number) => void };
  const fetchViews = () => { ansichtVorwaermen('leads'); ansichtVorwaermen('kalender'); };
  if (browser.requestIdleCallback && browser.cancelIdleCallback) {
    const id = browser.requestIdleCallback(fetchViews);
    return () => browser.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(fetchViews, 1500);
  return () => window.clearTimeout(id);
}
