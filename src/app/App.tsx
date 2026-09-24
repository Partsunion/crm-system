import { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { LeadsView } from './components/LeadsView';
import { PipelineView } from './components/PipelineView';
import { Settings } from './components/Settings';
import { Login } from './components/Login';
import { UserManagement } from './components/UserManagement';
import { PipelineSettings } from './components/PipelineSettings';

import { OutreachView } from './components/OutreachView';
import { LayoutDashboard, Users, Workflow, Settings as SettingsIcon, Sparkles, Menu, X, LogOut, UserCog, Layers, Mail } from 'lucide-react';
import { isLoggedIn, logout, getCurrentUser } from './utils/storage';

export default function App() {
  const [activeView, setActiveView] = useState<'dashboard' | 'leads' | 'pipeline' | 'outreach' | 'settings' | 'users' | 'pipelineSettings'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [loggedIn, setLoggedIn] = useState(isLoggedIn());
  const currentUser = getCurrentUser();

  const handleNavigate = (view: 'dashboard' | 'leads' | 'pipeline' | 'outreach' | 'settings' | 'users' | 'pipelineSettings') => {
    setActiveView(view);
    setIsMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    setLoggedIn(false);
  };

  if (!loggedIn) {
    return <Login onLogin={() => setLoggedIn(true)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/20 to-gray-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-40 shadow-sm">
        <div className="px-4 md:px-8 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 md:gap-4">
              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 hover:bg-purple-50 rounded-xl transition-colors"
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5 text-gray-700" />
                ) : (
                  <Menu className="w-5 h-5 text-gray-700" />
                )}
              </button>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#7c3aed] to-[#a78bfa] rounded-xl flex items-center justify-center shadow-lg glow-purple">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-base md:text-lg font-bold bg-gradient-to-r from-gray-900 via-purple-900 to-gray-900 bg-clip-text text-transparent">PartsUnion CRM</h1>
                  <p className="text-xs text-gray-500 hidden md:block">Autoteile · Outreach · Pipeline</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <div className="hidden sm:flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-purple-50 to-transparent rounded-xl border border-purple-100">
                <div className="w-8 h-8 bg-gradient-to-br from-[#7c3aed] to-[#a78bfa] rounded-lg flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-sm">{currentUser?.name[0]}</span>
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-gray-900">{currentUser?.name}</p>
                  <p className="text-xs text-purple-600 font-medium">{currentUser?.role}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2.5 text-gray-600 hover:text-gray-900 hover:bg-gradient-to-r hover:from-red-50 hover:to-transparent rounded-xl transition-all border border-transparent hover:border-red-100"
                title="Abmelden"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:inline text-sm font-medium">Abmelden</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-57px)] md:h-[calc(100vh-73px)]">
        {/* Mobile Overlay */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar - Desktop with Hover */}
        <aside
          className={`
            hidden lg:block relative
            bg-white/80 backdrop-blur-xl border-r border-gray-200/50
            transition-all duration-300 ease-in-out
            ${isSidebarExpanded ? 'w-64' : 'w-20'}
          `}
          onMouseEnter={() => setIsSidebarExpanded(true)}
          onMouseLeave={() => setIsSidebarExpanded(false)}
        >
          <nav className="p-4 space-y-2">
            <button
              onClick={() => handleNavigate('dashboard')}
              className={`w-full flex items-center ${isSidebarExpanded ? 'gap-3' : 'justify-center'} px-4 py-3 rounded-xl transition-all font-medium text-sm ${activeView === 'dashboard'
                ? 'bg-gradient-to-r from-[#7c3aed] to-[#a78bfa] text-white shadow-lg shadow-purple-500/30'
                : 'text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-transparent hover:border-purple-100'
                }`}
              title={!isSidebarExpanded ? 'Dashboard' : ''}
            >
              <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
              {isSidebarExpanded && <span className="whitespace-nowrap">Dashboard</span>}
            </button>
            <button
              onClick={() => handleNavigate('leads')}
              className={`w-full flex items-center ${isSidebarExpanded ? 'gap-3' : 'justify-center'} px-4 py-3 rounded-xl transition-all font-medium text-sm ${activeView === 'leads'
                ? 'bg-gradient-to-r from-[#7c3aed] to-[#a78bfa] text-white shadow-lg shadow-purple-500/30'
                : 'text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-transparent hover:border-purple-100'
                }`}
              title={!isSidebarExpanded ? 'Leads' : ''}
            >
              <Users className="w-5 h-5 flex-shrink-0" />
              {isSidebarExpanded && <span className="whitespace-nowrap">Leads</span>}
            </button>
            <button
              onClick={() => handleNavigate('pipeline')}
              className={`w-full flex items-center ${isSidebarExpanded ? 'gap-3' : 'justify-center'} px-4 py-3 rounded-xl transition-all font-medium text-sm ${activeView === 'pipeline'
                ? 'bg-gradient-to-r from-[#7c3aed] to-[#a78bfa] text-white shadow-lg shadow-purple-500/30'
                : 'text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-transparent hover:border-purple-100'
                }`}
              title={!isSidebarExpanded ? 'Pipeline' : ''}
            >
              <Workflow className="w-5 h-5 flex-shrink-0" />
              {isSidebarExpanded && <span className="whitespace-nowrap">Pipeline</span>}
            </button>

            <button
              onClick={() => handleNavigate('outreach')}
              className={`w-full flex items-center ${isSidebarExpanded ? 'gap-3' : 'justify-center'} px-4 py-3 rounded-xl transition-all font-medium text-sm ${activeView === 'outreach'
                ? 'bg-gradient-to-r from-[#7c3aed] to-[#a78bfa] text-white shadow-lg shadow-purple-500/30'
                : 'text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-transparent hover:border-purple-100'
                }`}
              title={!isSidebarExpanded ? 'Outreach' : ''}
            >
              <Mail className="w-5 h-5 flex-shrink-0" />
              {isSidebarExpanded && <span className="whitespace-nowrap">Outreach</span>}
            </button>

            {/* Divider */}
            {isSidebarExpanded && (
              <div className="pt-4 mt-4 border-t border-gray-200/50">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-4 mb-2">Administration</p>
              </div>
            )}
            {!isSidebarExpanded && (
              <div className="pt-2 mt-2 border-t border-gray-200/50"></div>
            )}

            <button
              onClick={() => handleNavigate('settings')}
              className={`w-full flex items-center ${isSidebarExpanded ? 'gap-3' : 'justify-center'} px-4 py-3 rounded-xl transition-all font-medium text-sm ${activeView === 'settings'
                ? 'bg-gradient-to-r from-[#7c3aed] to-[#a78bfa] text-white shadow-lg shadow-purple-500/30'
                : 'text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-transparent hover:border-purple-100'
                }`}
              title={!isSidebarExpanded ? 'Einstellungen' : ''}
            >
              <SettingsIcon className="w-5 h-5 flex-shrink-0" />
              {isSidebarExpanded && <span className="whitespace-nowrap">Einstellungen</span>}
            </button>
            <button
              onClick={() => handleNavigate('users')}
              className={`w-full flex items-center ${isSidebarExpanded ? 'gap-3' : 'justify-center'} px-4 py-3 rounded-xl transition-all font-medium text-sm ${activeView === 'users'
                ? 'bg-gradient-to-r from-[#7c3aed] to-[#a78bfa] text-white shadow-lg shadow-purple-500/30'
                : 'text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-transparent hover:border-purple-100'
                }`}
              title={!isSidebarExpanded ? 'Benutzerverwaltung' : ''}
            >
              <UserCog className="w-5 h-5 flex-shrink-0" />
              {isSidebarExpanded && <span className="whitespace-nowrap">Benutzerverwaltung</span>}
            </button>
            <button
              onClick={() => handleNavigate('pipelineSettings')}
              className={`w-full flex items-center ${isSidebarExpanded ? 'gap-3' : 'justify-center'} px-4 py-3 rounded-xl transition-all font-medium text-sm ${activeView === 'pipelineSettings'
                ? 'bg-gradient-to-r from-[#7c3aed] to-[#a78bfa] text-white shadow-lg shadow-purple-500/30'
                : 'text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-transparent hover:border-purple-100'
                }`}
              title={!isSidebarExpanded ? 'Pipeline-Einstellungen' : ''}
            >
              <Layers className="w-5 h-5 flex-shrink-0" />
              {isSidebarExpanded && <span className="whitespace-nowrap">Pipeline-Einstellungen</span>}
            </button>
          </nav>
        </aside>

        {/* Sidebar - Mobile */}
        <aside className={`
          fixed lg:hidden inset-y-0 left-0 z-40
          w-64 bg-white/80 backdrop-blur-xl border-r border-gray-200/50
          transform transition-transform duration-300 ease-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          mt-[57px] md:mt-[73px]
        `}>
          <nav className="p-4 space-y-2">
            <button
              onClick={() => handleNavigate('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${activeView === 'dashboard'
                ? 'bg-gradient-to-r from-[#7c3aed] to-[#a78bfa] text-white shadow-lg shadow-purple-500/30'
                : 'text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-transparent hover:border-purple-100'
                }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => handleNavigate('leads')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${activeView === 'leads'
                ? 'bg-gradient-to-r from-[#7c3aed] to-[#a78bfa] text-white shadow-lg shadow-purple-500/30'
                : 'text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-transparent hover:border-purple-100'
                }`}
            >
              <Users className="w-5 h-5" />
              <span>Leads</span>
            </button>
            <button
              onClick={() => handleNavigate('pipeline')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${activeView === 'pipeline'
                ? 'bg-gradient-to-r from-[#7c3aed] to-[#a78bfa] text-white shadow-lg shadow-purple-500/30'
                : 'text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-transparent hover:border-purple-100'
                }`}
            >
              <Workflow className="w-5 h-5" />
              <span>Pipeline</span>
            </button>

            <button
              onClick={() => handleNavigate('outreach')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${activeView === 'outreach'
                ? 'bg-gradient-to-r from-[#7c3aed] to-[#a78bfa] text-white shadow-lg shadow-purple-500/30'
                : 'text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-transparent hover:border-purple-100'
                }`}
            >
              <Mail className="w-5 h-5" />
              <span>Outreach</span>
            </button>
            <div className="pt-4 mt-4 border-t border-gray-200/50">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-4 mb-2">Administration</p>
              <button
                onClick={() => handleNavigate('settings')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${activeView === 'settings'
                  ? 'bg-gradient-to-r from-[#7c3aed] to-[#a78bfa] text-white shadow-lg shadow-purple-500/30'
                  : 'text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-transparent hover:border-purple-100'
                  }`}
              >
                <SettingsIcon className="w-5 h-5" />
                <span>Einstellungen</span>
              </button>
              <button
                onClick={() => handleNavigate('users')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${activeView === 'users'
                  ? 'bg-gradient-to-r from-[#7c3aed] to-[#a78bfa] text-white shadow-lg shadow-purple-500/30'
                  : 'text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-transparent hover:border-purple-100'
                  }`}
              >
                <UserCog className="w-5 h-5" />
                <span>Benutzerverwaltung</span>
              </button>
              <button
                onClick={() => handleNavigate('pipelineSettings')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${activeView === 'pipelineSettings'
                  ? 'bg-gradient-to-r from-[#7c3aed] to-[#a78bfa] text-white shadow-lg shadow-purple-500/30'
                  : 'text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-transparent hover:border-purple-100'
                  }`}
              >
                <Layers className="w-5 h-5" />
                <span>Pipeline-Einstellungen</span>
              </button>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {activeView === 'dashboard' && <Dashboard />}
          {activeView === 'leads' && <LeadsView />}
          {activeView === 'pipeline' && <PipelineView />}

          {activeView === 'outreach' && <OutreachView />}
          {activeView === 'settings' && <Settings />}
          {activeView === 'users' && <UserManagement />}
          {activeView === 'pipelineSettings' && <PipelineSettings />}
        </main>
      </div>
    </div>
  );
}