import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { WORKSPACE_FRAME } from './components/layout/workspaceShell';
import { Login } from './components/Login';
import { Sidebar, VIEW_LABELS, type ViewId } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { logout, getCurrentUser, validateSession, syncSettingsFromServer } from './utils/storage';
import { AccountSecurity } from './components/AccountSecurity';
import { AccountRecovery } from './components/AccountRecovery';
import { VIEW_PATHS, viewFromPath } from './utils/navigation';
import { mayLeaveWorkspace } from './utils/useWorkspaceGuard';
import { toast } from 'sonner';
import { vergessen } from './utils/zwischenspeicher';
import { ansichtenVorwaermen } from './vorwaermen';
import { PhoneProvider } from './phone/PhoneProvider';
import type { LeadWorkRequest } from './components/LeadsView';

/**
 * Die Befehlspalette oeffnet erst auf ⌘K. Sie eager zu laden hiess: die
 * Befehlspalette und cmdk beim Start mitzuziehen, fuer ein Fenster, das die
 * meisten nie aufmachen. Die Einblendung selbst ist reines CSS.
 */
const CommandPalette = lazy(() =>
  import('./components/CommandPalette').then(({ CommandPalette }) => ({ default: CommandPalette })),
);

const Dashboard = lazy(() => import('./components/Dashboard').then(({ Dashboard }) => ({ default: Dashboard })));
const LeadsView = lazy(() => import('./components/LeadsView').then(({ LeadsView }) => ({ default: LeadsView })));
const PipelineView = lazy(() =>
  import('./components/PipelineView').then(({ PipelineView }) => ({ default: PipelineView })),
);
const ScraperView = lazy(() => import('./components/ScraperView').then(({ ScraperView }) => ({ default: ScraperView })));
const ReportsView = lazy(() => import('./components/ReportsView').then(({ ReportsView }) => ({ default: ReportsView })));
const KalenderView = lazy(() =>
  import('./components/KalenderView').then(({ KalenderView }) => ({ default: KalenderView })),
);
const Settings = lazy(() => import('./components/Settings').then(({ Settings }) => ({ default: Settings })));
const UserManagement = lazy(() =>
  import('./components/UserManagement').then(({ UserManagement }) => ({ default: UserManagement })),
);
const PipelineSettings = lazy(() =>
  import('./components/PipelineSettings').then(({ PipelineSettings }) => ({ default: PipelineSettings })),
);

export type LeadAction = 'new' | 'import' | null;

export default function App() {
  const [activeView, updateActiveView] = useState<ViewId>(() => viewFromPath(window.location.pathname));
  const mainRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (mainRef.current) { mainRef.current.scrollTop = 0; mainRef.current.scrollLeft = 0; }
  }, [activeView]);
  const [accountView, setAccountView] = useState(() => window.location.pathname === '/reset-password' || window.location.pathname === '/change-password');
  const [mobileOpen, setMobileOpen] = useState(false);
  const historyIndex = useRef<number>(typeof window.history.state?.crmIndex === 'number' ? window.history.state.crmIndex : 0);
  const acceptedUrl = useRef(window.location.pathname + window.location.search + window.location.hash);
  const restoringHistory = useRef(false);
  const setActiveView = useCallback((view: ViewId): boolean => {
    if (!mayLeaveWorkspace()) return false;
    const path = VIEW_PATHS[view];
    if (acceptedUrl.current !== path) window.history.pushState({ crmIndex: ++historyIndex.current }, '', path);
    acceptedUrl.current = path;
    updateActiveView(view); setMobileOpen(false);
    return true;
  }, []);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [pendingLeadAction, setPendingLeadAction] = useState<LeadAction>(null);
  const [pendingWorkView, setPendingWorkView] = useState<LeadWorkRequest | null>(null);
  // Lead, der beim Wechsel auf die Leads-Ansicht direkt geöffnet werden soll
  // (Sprung aus Kalender/Tagesplan in die Lead-Maske).
  const [pendingLeadId, setPendingLeadId] = useState<string | null>(() => new URLSearchParams(window.location.search).get('lead'));
  const [loggedIn, setLoggedIn] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState(false);
  // Bump erzwingt Remount der aktiven Ansicht → alle Daten + Settings frisch.
  const [refreshTick, setRefreshTick] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const currentUser = getCurrentUser();

  const checkSession = useCallback(async () => {
    setSessionLoading(true); setSessionError(false);
    try { const user = await validateSession(); setLoggedIn(Boolean(user)); }
    catch { setSessionError(true); }
    finally { setSessionLoading(false); }
  }, []);
  useEffect(() => { void checkSession(); }, [checkSession]);
  useEffect(() => {
    window.history.replaceState({ ...window.history.state, crmIndex: historyIndex.current }, '', window.location.href);
    const expired = () => setLoggedIn(false);
    const back = () => {
      if (restoringHistory.current) { restoringHistory.current = false; return; }
      const nextIndex = typeof window.history.state?.crmIndex === 'number' ? window.history.state.crmIndex : null;
      if (!mayLeaveWorkspace()) {
        if (nextIndex !== null && nextIndex !== historyIndex.current) {
          restoringHistory.current = true;
          window.history.go(historyIndex.current - nextIndex);
        } else {
          window.history.pushState({ crmIndex: historyIndex.current }, '', acceptedUrl.current);
        }
        return;
      }
      historyIndex.current = nextIndex ?? historyIndex.current + 1;
      acceptedUrl.current = window.location.pathname + window.location.search + window.location.hash;
      window.history.replaceState({ ...window.history.state, crmIndex: historyIndex.current }, '', acceptedUrl.current);
      updateActiveView(viewFromPath(window.location.pathname));
      setAccountView(['/reset-password', '/change-password'].includes(window.location.pathname));
      setPendingLeadId(new URLSearchParams(window.location.search).get('lead'));
    };
    window.addEventListener('crm:session-expired', expired); window.addEventListener('popstate', back);
    return () => { window.removeEventListener('crm:session-expired', expired); window.removeEventListener('popstate', back); };
  }, []);
  useEffect(() => {
    if (!loggedIn) return;
    const revalidate = async () => {
      if (document.visibilityState === 'hidden') return;
      try { const user = await validateSession(); if (!user) setLoggedIn(false); else if (user.must_change_password) setAccountView(true); } catch { /* A transient offline state is not a session revocation. */ }
    };
    window.addEventListener('focus', revalidate);
    const timer = window.setInterval(() => void revalidate(), 5 * 60_000);
    return () => { window.removeEventListener('focus', revalidate); window.clearInterval(timer); };
  }, [loggedIn]);

  // Geteilte Einstellungen (Status/Pipeline/Quellen) beim Start vom Server holen —
  // sonst sieht jeder Browser nur seinen eigenen localStorage-Stand.
  useEffect(() => {
    if (!loggedIn) return;
    void syncSettingsFromServer().then((changed) => { if (changed) setRefreshTick((t) => t + 1); });
    return ansichtenVorwaermen();
  }, [loggedIn]);

  const handleRefresh = useCallback(async () => {
    if (!mayLeaveWorkspace()) return;
    setRefreshing(true);
    // ZUERST den Zwischenspeicher leeren, dann neu aufbauen. Andersherum
    // baeke der Neuaufbau die eben gemerkten Daten wieder ein und der Knopf
    // wuerde sich drehen, ohne irgendetwas zu holen.
    vergessen();
    try { await syncSettingsFromServer(); } finally {
      setRefreshTick((t) => t + 1);
      setRefreshing(false);
    }
  }, []);

  const openLead = useCallback((leadId: string) => {
    if (!setActiveView('leads')) return;
    acceptedUrl.current = `/leads?lead=${encodeURIComponent(leadId)}`;
    window.history.replaceState({ crmIndex: historyIndex.current }, '', acceptedUrl.current);
    setPendingLeadId(leadId);
  }, [setActiveView]);

  // ⌘K / Ctrl+K → Command Palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (accountView || currentUser?.must_change_password) return <AccountRecovery forced={Boolean(currentUser?.must_change_password) || window.location.pathname === '/change-password'} onDone={() => { setAccountView(false); setLoggedIn(false); window.history.replaceState(null, '', '/'); }} />;
  if (sessionLoading) return <main className="flex min-h-screen items-center justify-center bg-canvas text-sm text-text-secondary" role="status">Sitzung wird geprüft…</main>;
  if (sessionError) return <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas"><p>Die Sitzung konnte nicht geprüft werden.</p><button onClick={() => void checkSession()} className="rounded-md bg-accent-600 px-4 py-2 text-white">Erneut versuchen</button></main>;
  if (!loggedIn) return <Login onLogin={() => setLoggedIn(true)} onReset={() => { window.history.pushState(null, '', '/reset-password'); setAccountView(true); }} />;

  const triggerLeadAction = (action: Exclude<LeadAction, null>) => {
    if (!setActiveView('leads')) return;
    setPendingLeadAction(action);
  };

  return (
    <PhoneProvider user={currentUser} onOpenLead={openLead}>
    <div className={WORKSPACE_FRAME} data-workspace="crm">
      <a href="#crm-main-content" className="sr-only rounded-md bg-accent-600 px-3 py-2 text-sm text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100]">Zum Hauptinhalt springen</a>
      <Sidebar
        activeView={activeView}
        onNavigate={setActiveView}
        mobileOpen={mobileOpen}
        onMobileOpenChange={setMobileOpen}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          title={VIEW_LABELS[activeView]}
          user={currentUser}
          onOpenMobileSidebar={() => setMobileOpen(true)}
          onOpenPalette={() => setPaletteOpen(true)}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          onNewLead={activeView === 'dashboard' ? () => triggerLeadAction('new') : undefined}
          onChangePassword={() => setActiveView('security')}
          onLogout={async () => {
            if (!window.dispatchEvent(new Event('crm:logout-check', { cancelable: true }))) return;
            if (!mayLeaveWorkspace()) return;
            setLoggedIn(false);
            try { await logout(); } catch (e) { toast.error(e instanceof Error ? e.message : 'Abmelden fehlgeschlagen.'); }
          }}
        />

        <main ref={mainRef} id="crm-main-content" className="flex-1 overflow-auto" role="main" tabIndex={-1}>
          {/* Einblendung als CSS statt ueber die Bewegungsbibliothek — siehe
              .ansicht-herein in premium.css. Der `key` bleibt: er sorgt fuer
              den Neuaufbau beim Wechsel, und damit laeuft die Animation
              ueberhaupt erst an. */}
          <div key={`${activeView}:${refreshTick}`} className="ansicht-herein h-full">
            <Suspense
              fallback={
                <div className="flex h-full min-h-48 items-center justify-center text-sm text-text-muted" role="status">
                  Ansicht wird geladen…
                </div>
              }
            >
              {activeView === 'dashboard' && <Dashboard onOpenKalender={() => setActiveView('kalender')} onOpenLead={openLead} onOpenLeads={(preset = 'all', options) => { if (setActiveView('leads')) setPendingWorkView({view:preset,...options}); }} />}
              {activeView === 'leads' && (
                <LeadsView
                  pendingAction={pendingLeadAction}
                  pendingWorkView={pendingWorkView}
                  onWorkViewHandled={() => setPendingWorkView(null)}
                  onPendingHandled={() => setPendingLeadAction(null)}
                  pendingLeadId={pendingLeadId}
                  onPendingLeadHandled={() => setPendingLeadId(null)}
                />
              )}
              {activeView === 'pipeline' && <PipelineView />}
              {activeView === 'scraper' && <ScraperView />}
              {activeView === 'reports' && <ReportsView />}
              {activeView === 'kalender' && <KalenderView onOpenLead={openLead} />}
              {activeView === 'settings' && <Settings />}
              {activeView === 'security' && <AccountSecurity onPasswordChanged={() => { setLoggedIn(false); setActiveView('dashboard'); }} />}
              {activeView === 'users' && <UserManagement />}
              {activeView === 'pipelineSettings' && (currentUser?.role === 'manager' || currentUser?.app_access?.admin ? <PipelineSettings /> : <div className="p-8 text-sm text-text-secondary">Pipeline-Einstellungen werden von der Vertriebsleitung verwaltet.</div>)}
            </Suspense>
          </div>
        </main>
      </div>

      {/* Ohne Rueckfall-Anzeige: bis das Buendel da ist, soll gar nichts zu
          sehen sein — ein Ladehinweis mitten auf dem Bildschirm waere
          stoerender als die Palette einen Wimpernschlag spaeter. */}
      <Suspense fallback={null}>
      {paletteOpen && <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onNavigate={setActiveView}
        onNewLead={() => triggerLeadAction('new')}
        onImport={() => triggerLeadAction('import')}
      />}
      </Suspense>
    </div>
    </PhoneProvider>
  );
}
