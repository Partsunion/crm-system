import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Mail, Send, MapPin, Target, TrendingUp, Users, CheckCircle, Clock,
  AlertCircle, Play, Pause, RotateCw, Eye, Zap, Globe, ChevronRight,
  ArrowRight, Search, RefreshCw, Loader2, MailCheck, MailX, MailOpen,
  Power, Rocket, Settings, ChevronDown
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://website-crm-scraper-backend-production.up.railway.app';

interface AutoPilotStatus {
  running: boolean;
  startedAt: string | null;
  runtime: string;
  config: {
    discoveryIntervalMinutes: number;
    campaignIntervalMinutes: number;
    followUpIntervalMinutes: number;
    maxEmailsPerBatch: number;
    maxDiscoveryPerRun: number;
  };
  stats: {
    totalDiscovered: number;
    totalSent: number;
    totalFollowUps: number;
    cycleCount: number;
  };
  lastActivity: {
    discovery: string | null;
    campaign: string | null;
    followUp: string | null;
  };
  errors: string[];
}

interface OutreachStats {
  outreach: {
    total: number;
    withEmail: number;
    sent: number;
    replied: number;
    converted: number;
    unsent: number;
    conversionRate: string;
    byBundesland: Array<{ bundesland: string; count: number }>;
  };
  discovery: {
    total: number;
    bySource: Array<{ source: string; count: number }>;
    byBundesland: Array<{ bundesland: string; count: number }>;
    byNiche: Array<{ niche: string; count: number }>;
    nextTarget: { bundesland: string; city: string; niche: string };
    totalCombinations: number;
    currentIndex: number;
  };
  autopilot?: AutoPilotStatus;
}

interface Bundesland {
  name: string;
  cities?: string[];
  Städte?: string[];
}

const NISCHEN = [
  'Autoteilehändler',
  'Autowerkstatt',
  'Autohaus',
  'Kfz-Teile Handel',
  'Autoverwertung',
  'LKW Teile',
  'Reifenhändler',
  'Karosserie Lackierung',
];

export function OutreachView() {
  const [stats, setStats] = useState<OutreachStats | null>(null);
  const [bundeslaender, setBundeslaender] = useState<Bundesland[]>([]);
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [sendingCampaign, setSendingCampaign] = useState(false);
  const [selectedBundesland, setSelectedBundesland] = useState('');
  const [selectedNische, setSelectedNische] = useState('Autoteilehändler');
  const [brochureUrl, setBrochureUrl] = useState('');
  const [showBrochure, setShowBrochure] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [togglingAutoPilot, setTogglingAutoPilot] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-Pilot config state
  const [cfgDiscoveryMin, setCfgDiscoveryMin] = useState(30);
  const [cfgCampaignMin, setCfgCampaignMin] = useState(60);
  const [cfgFollowUpMin, setCfgFollowUpMin] = useState(360);
  const [cfgMaxEmails, setCfgMaxEmails] = useState(10);
  const [cfgMaxDiscovery, setCfgMaxDiscovery] = useState(15);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/outreach/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        // Sync config from server if autopilot has config
        if (data.autopilot?.config) {
          setCfgDiscoveryMin(data.autopilot.config.discoveryIntervalMinutes);
          setCfgCampaignMin(data.autopilot.config.campaignIntervalMinutes);
          setCfgFollowUpMin(data.autopilot.config.followUpIntervalMinutes);
          setCfgMaxEmails(data.autopilot.config.maxEmailsPerBatch);
          setCfgMaxDiscovery(data.autopilot.config.maxDiscoveryPerRun);
        }
      }
    } catch (err) {
      console.error('Failed to load outreach stats:', err);
    }
  }, []);

  const loadBundeslaender = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/outreach/discover/bundeslaender`);
      if (res.ok) {
        const data = await res.json();
        setBundeslaender(data);
      }
    } catch (err) {
      console.error('Failed to load bundeslaender:', err);
    }
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([loadStats(), loadBundeslaender()]);
      setLoading(false);
    }
    init();
  }, [loadStats, loadBundeslaender]);

  // Auto-refresh when auto-pilot is running
  useEffect(() => {
    if (stats?.autopilot?.running) {
      pollRef.current = setInterval(loadStats, 15000);
    } else if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [stats?.autopilot?.running, loadStats]);

  const handleToggleAutoPilot = async () => {
    setTogglingAutoPilot(true);
    const isRunning = stats?.autopilot?.running;
    try {
      const endpoint = isRunning ? 'autopilot/stop' : 'autopilot/start';
      const body = isRunning ? {} : {
        discoveryIntervalMinutes: cfgDiscoveryMin,
        campaignIntervalMinutes: cfgCampaignMin,
        followUpIntervalMinutes: cfgFollowUpMin,
        maxEmailsPerBatch: cfgMaxEmails,
        maxDiscoveryPerRun: cfgMaxDiscovery,
      };
      const res = await fetch(`${API_BASE_URL}/api/outreach/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      setStatusMessage({
        type: data.success ? 'success' : 'error',
        text: data.message || (isRunning ? 'Auto-Pilot gestoppt' : 'Auto-Pilot gestartet')
      });
      await loadStats();
    } catch {
      setStatusMessage({ type: 'error', text: 'Auto-Pilot konnte nicht umgeschaltet werden.' });
    } finally {
      setTogglingAutoPilot(false);
    }
  };

  const handleDiscover = async () => {
    if (!selectedBundesland) {
      setStatusMessage({ type: 'error', text: 'Bitte wähle ein Bundesland aus.' });
      return;
    }
    setDiscovering(true);
    setStatusMessage({ type: 'info', text: `Suche ${selectedNische} in ${selectedBundesland}...` });
    try {
      const res = await fetch(`${API_BASE_URL}/api/outreach/discover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bundesland: selectedBundesland, niche: selectedNische })
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage({ type: 'success', text: `✅ ${data.discovered || data.found || data.newLeads || 0} neue Leads gefunden!` });
        await loadStats();
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Fehler bei der Suche.' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Netzwerkfehler bei der Suche.' });
    } finally {
      setDiscovering(false);
    }
  };

  const handleStartCampaign = async () => {
    setSendingCampaign(true);
    setStatusMessage({ type: 'info', text: 'Kampagne wird gestartet...' });
    try {
      const res = await fetch(`${API_BASE_URL}/api/outreach/campaign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: cfgMaxEmails })
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage({ type: 'success', text: `✅ ${data.sent || 0} E-Mails versendet!` });
        await loadStats();
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Kampagne fehlgeschlagen.' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Kampagne konnte nicht gestartet werden.' });
    } finally {
      setSendingCampaign(false);
    }
  };

  const openBrochurePreview = () => {
    const url = `${API_BASE_URL}/api/outreach/preview-brochure?company=Mustermann%20Autoteile%20GmbH&city=Köln&score=35`;
    setBrochureUrl(url);
    setShowBrochure(true);
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
          <p className="text-gray-500 font-medium">Outreach-Daten werden geladen...</p>
        </div>
      </div>
    );
  }

  const o = stats?.outreach || { total: 0, withEmail: 0, sent: 0, replied: 0, converted: 0, unsent: 0, conversionRate: '0', byBundesland: [] };
  const d = stats?.discovery || { total: 0, bySource: [], byBundesland: [], byNiche: [], nextTarget: { bundesland: '', city: '', niche: '' }, totalCombinations: 0, currentIndex: 0 };
  const ap = stats?.autopilot;
  const isRunning = ap?.running || false;

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 bg-gradient-to-br from-gray-50 via-purple-50/30 to-gray-50">
      {/* Header */}
      <div className="animate-slide-in-up">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 via-purple-900 to-gray-900 bg-clip-text text-transparent">
              E-Mail-Marketing
            </h2>
            <p className="text-gray-600 mt-2 text-sm md:text-base">
              PartsUnion — Automatisierter Bundesländer-Outreach
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => loadStats()}
              className="p-2.5 hover:bg-purple-50 rounded-xl transition-colors border border-gray-200"
              title="Alle Statistiken und Daten neu laden"
            >
              <RefreshCw className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={openBrochurePreview}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#7c3aed] to-[#a78bfa] text-white rounded-xl font-medium text-sm shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all hover:scale-[1.02]"
              title="Vorschau der E-Mail-Broschüre anzeigen, die an potenzielle Kunden versendet wird"
            >
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">Broschüre</span>
            </button>
          </div>
        </div>
      </div>

      {/* Status Message */}
      {statusMessage && (
        <div className={`p-4 rounded-xl border animate-slide-in-up ${
          statusMessage.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
          statusMessage.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
          'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <div className="flex items-center justify-between">
            <p className="font-medium text-sm">{statusMessage.text}</p>
            <button onClick={() => setStatusMessage(null)} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="stats-card group animate-scale-in" title="Gesamtanzahl aller gefundenen Firmen in der Datenbank — inkl. solche ohne E-Mail-Adresse">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 rounded-full" title="Lead-Pool: alle gefundenen Firmen">
              <Globe className="w-3 h-3 text-blue-600" />
              <span className="text-xs font-bold text-blue-600">Pool</span>
            </div>
          </div>
          <p className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">{o.total}</p>
          <p className="text-sm font-medium text-gray-500">Gesamt Leads</p>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 bg-gray-100 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${o.total > 0 ? (o.withEmail / o.total) * 100 : 0}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 font-medium">{o.withEmail} mit E-Mail</span>
          </div>
        </div>

        <div className="stats-card group animate-scale-in" style={{ animationDelay: '0.1s' }} title="Anzahl der E-Mails die bereits über SMTP (info@partsunion.de) versendet wurden">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 glow-purple">
              <Send className="w-6 h-6 text-white" />
            </div>
            <div className="flex items-center gap-1 px-2 py-1 bg-purple-100 rounded-full" title="Versand über den SMTP-Server smtp.strato.de">
              <Mail className="w-3 h-3 text-purple-600" />
              <span className="text-xs font-bold text-purple-600">SMTP</span>
            </div>
          </div>
          <p className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent mb-1">{o.sent}</p>
          <p className="text-sm font-medium text-gray-500">Gesendet</p>
          <p className="text-xs text-gray-400 mt-2">{o.unsent} noch nicht kontaktiert</p>
        </div>

        <div className="stats-card group animate-scale-in" style={{ animationDelay: '0.2s' }} title="Anzahl der Leads die auf unsere E-Mail geantwortet haben — Antwortrate in Prozent">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <MailOpen className="w-6 h-6 text-white" />
            </div>
            <div className="flex items-center gap-1 px-2 py-1 bg-green-100 rounded-full" title="Antwortrate: wie viel Prozent der kontaktierten Leads haben geantwortet">
              <TrendingUp className="w-3 h-3 text-green-600" />
              <span className="text-xs font-bold text-green-600">{o.sent > 0 ? `${Math.round((o.replied / o.sent) * 100)}%` : '0%'}</span>
            </div>
          </div>
          <p className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">{o.replied}</p>
          <p className="text-sm font-medium text-gray-500">Antworten</p>
        </div>

        <div className="stats-card group animate-scale-in" style={{ animationDelay: '0.3s' }} title="Leads die tatsächlich zu Kunden konvertiert wurden — Konversionsrate in Prozent">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 rounded-full" title="Konversionsrate: Prozent der angeschriebenen Leads die Kunden wurden">
              <Zap className="w-3 h-3 text-orange-600" />
              <span className="text-xs font-bold text-orange-600">{o.conversionRate}%</span>
            </div>
          </div>
          <p className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">{o.converted}</p>
          <p className="text-sm font-medium text-gray-500">Konvertiert</p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          UNIFIED OUTREACH ENGINE — Auto-Pilot + Manual Discovery
          ═══════════════════════════════════════════════════════ */}
      <div className={`rounded-2xl border-2 overflow-hidden transition-all ${
        isRunning
          ? 'border-green-400 shadow-lg shadow-green-500/10'
          : 'border-gray-200'
      }`}>
        {/* Engine Header */}
        <div className={`p-6 ${
          isRunning
            ? 'bg-gradient-to-r from-green-50 via-emerald-50 to-green-50'
            : 'bg-white'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
                isRunning
                  ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                  : 'bg-gradient-to-br from-[#7c3aed] to-[#a78bfa]'
              }`}>
                <Rocket className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  Outreach Engine
                  {isRunning && (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-green-600 bg-green-100 px-2.5 py-1 rounded-full">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      AUTO-PILOT AKTIV
                    </span>
                  )}
                </h3>
                <p className="text-xs text-gray-500">
                  {isRunning
                    ? `Läuft seit ${ap?.runtime} — Zyklus #${ap?.stats?.cycleCount || 0}`
                    : 'Lead-Discovery + E-Mail-Kampagnen — Manuell oder Auto-Pilot'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Config Toggle */}
              <button
                onClick={() => setShowConfig(!showConfig)}
                className={`p-2.5 rounded-xl border transition-all ${
                  showConfig ? 'bg-purple-50 border-purple-300 text-purple-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
                title="Auto-Pilot Einstellungen öffnen: Intervalle, Batch-Größen und Limits anpassen"
              >
                <Settings className="w-4 h-4" />
              </button>

              {/* Auto-Pilot Toggle */}
              <button
                onClick={handleToggleAutoPilot}
                disabled={togglingAutoPilot}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg transition-all hover:scale-[1.03] disabled:opacity-50 ${
                  isRunning
                    ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-red-500/30 hover:shadow-red-500/50'
                    : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-green-500/30 hover:shadow-green-500/50'
                }`}
                title={isRunning
                  ? 'Auto-Pilot stoppen — laufende Suche und E-Mail-Versand werden beendet'
                  : 'Auto-Pilot starten — sucht automatisch Leads und verschickt E-Mails nach den eingestellten Intervallen'
                }
              >
                {togglingAutoPilot ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isRunning ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                {isRunning ? 'Stoppen' : 'Auto-Pilot'}
              </button>
            </div>
          </div>

          {/* Auto-Pilot Live Stats */}
          {(isRunning || (ap?.stats?.cycleCount ?? 0) > 0) && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              <div className="bg-white/80 p-3 rounded-xl border border-gray-100 text-center" title="Anzahl der Leads die der Auto-Pilot in dieser Sitzung automatisch gefunden hat">
                <p className="text-2xl font-bold text-purple-600">{ap?.stats?.totalDiscovered ?? 0}</p>
                <p className="text-xs text-gray-500 mt-1">Entdeckt</p>
              </div>
              <div className="bg-white/80 p-3 rounded-xl border border-gray-100 text-center" title="Anzahl der E-Mails die der Auto-Pilot in dieser Sitzung automatisch versendet hat">
                <p className="text-2xl font-bold text-green-600">{ap?.stats?.totalSent ?? 0}</p>
                <p className="text-xs text-gray-500 mt-1">Gesendet</p>
              </div>
              <div className="bg-white/80 p-3 rounded-xl border border-gray-100 text-center" title="Anzahl der Nachfass-E-Mails an Leads die nicht geantwortet haben">
                <p className="text-2xl font-bold text-blue-600">{ap?.stats?.totalFollowUps ?? 0}</p>
                <p className="text-xs text-gray-500 mt-1">Follow-Ups</p>
              </div>
              <div className="bg-white/80 p-3 rounded-xl border border-gray-100 text-center" title="Wie oft der Auto-Pilot einen kompletten Discovery-Durchlauf gemacht hat">
                <p className="text-2xl font-bold text-gray-700">{ap?.stats?.cycleCount ?? 0}</p>
                <p className="text-xs text-gray-500 mt-1">Zyklen</p>
              </div>
            </div>
          )}

          {/* Discovery Progress */}
          <div className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">Entdeckungsfortschritt</span>
              <span className="text-xs font-bold text-purple-600">{d.currentIndex} / {d.totalCombinations}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div
                className="bg-gradient-to-r from-[#7c3aed] to-[#a78bfa] h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${d.totalCombinations > 0 ? (d.currentIndex / d.totalCombinations) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* ── Config Panel (Collapsible) ── */}
        {showConfig && (
          <div className="border-t border-gray-200 bg-gradient-to-br from-gray-50 to-purple-50/20 p-6">
            <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4 text-purple-500" />
              Auto-Pilot Einstellungen
              {isRunning && (
                <span className="text-xs font-normal text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                  Stoppe Auto-Pilot um Werte zu ändern
                </span>
              )}
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <div title="Wie oft der Auto-Pilot automatisch nach neuen Leads sucht (in Minuten)">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Discovery Intervall</label>
                <div className="relative">
                  <input
                    type="number"
                    min={5}
                    max={240}
                    value={cfgDiscoveryMin}
                    onChange={(e) => setCfgDiscoveryMin(parseInt(e.target.value) || 30)}
                    disabled={isRunning}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:opacity-50 disabled:bg-gray-100"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">Min</span>
                </div>
              </div>
              <div title="Wie oft der Auto-Pilot automatisch E-Mails an neue Leads verschickt (in Minuten)">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Kampagne Intervall</label>
                <div className="relative">
                  <input
                    type="number"
                    min={10}
                    max={480}
                    value={cfgCampaignMin}
                    onChange={(e) => setCfgCampaignMin(parseInt(e.target.value) || 60)}
                    disabled={isRunning}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:opacity-50 disabled:bg-gray-100"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">Min</span>
                </div>
              </div>
              <div title="Wie oft der Auto-Pilot Nachfass-E-Mails an Leads schickt, die noch nicht geantwortet haben (in Minuten)">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Follow-Up Intervall</label>
                <div className="relative">
                  <input
                    type="number"
                    min={60}
                    max={1440}
                    value={cfgFollowUpMin}
                    onChange={(e) => setCfgFollowUpMin(parseInt(e.target.value) || 360)}
                    disabled={isRunning}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:opacity-50 disabled:bg-gray-100"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">Min</span>
                </div>
              </div>
              <div title="Maximale Anzahl E-Mails die pro Kampagnen-Durchlauf auf einmal versendet werden">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">E-Mails / Batch</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={cfgMaxEmails}
                  onChange={(e) => setCfgMaxEmails(parseInt(e.target.value) || 10)}
                  disabled={isRunning}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:opacity-50 disabled:bg-gray-100"
                />
              </div>
              <div title="Maximale Anzahl neuer Leads die pro Discovery-Durchlauf gesucht werden">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Leads / Discovery</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={cfgMaxDiscovery}
                  onChange={(e) => setCfgMaxDiscovery(parseInt(e.target.value) || 15)}
                  disabled={isRunning}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:opacity-50 disabled:bg-gray-100"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Manual Controls (Collapsible) ── */}
        <div className="border-t border-gray-200">
          <button
            onClick={() => setManualMode(!manualMode)}
            className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-bold text-gray-700">Manuelle Suche</span>
              <span className="text-xs text-gray-400">— Einzelnes Bundesland gezielt durchsuchen</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${manualMode ? 'rotate-180' : ''}`} />
          </button>

          {manualMode && (
            <div className="px-6 pb-6 bg-white">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Bundesland</label>
                  <select
                    value={selectedBundesland}
                    onChange={(e) => setSelectedBundesland(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all appearance-none cursor-pointer"
                  >
                    <option value="">— Bundesland wählen —</option>
                    {bundeslaender.map((bl, i) => (
                      <option key={i} value={bl.name}>{bl.name} ({bl.cities?.length || bl.Städte?.length || 0} Städte)</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Branche / Nische</label>
                  <select
                    value={selectedNische}
                    onChange={(e) => setSelectedNische(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all appearance-none cursor-pointer"
                  >
                    {NISCHEN.map((n, i) => (
                      <option key={i} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                onClick={handleDiscover}
                disabled={discovering || !selectedBundesland}
                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-[#7c3aed] to-[#a78bfa] text-white rounded-xl font-semibold text-sm shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                title="Einmalig manuell nach Leads in dem ausgewählten Bundesland und der Branche suchen"
              >
                {discovering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {discovering ? 'Suche läuft...' : `Suche starten — ${selectedBundesland || 'Bundesland wählen'}`}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ═══ E-MAIL-KAMPAGNE ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Campaign Panel */}
        <div className="lg:col-span-2 card-premium bg-white p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">📧 E-Mail-Kampagne</h3>
              <p className="text-xs text-gray-500 mt-1">Broschüre an unkontaktierte Leads senden</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs font-medium text-green-600">SMTP Aktiv</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 p-4 rounded-xl text-center" title="Leads mit E-Mail die noch keine Broschüre erhalten haben — bereit zum Versand">
              <MailCheck className="w-5 h-5 text-purple-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{o.unsent}</p>
              <p className="text-xs text-gray-500">Warteschlange</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100/50 p-4 rounded-xl text-center" title="Leads an die bereits eine Broschüre per E-Mail versendet wurde">
              <Send className="w-5 h-5 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{o.sent}</p>
              <p className="text-xs text-gray-500">Versendet</p>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 p-4 rounded-xl text-center" title="Leads die auf unsere E-Mail reagiert und geantwortet haben">
              <MailOpen className="w-5 h-5 text-orange-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{o.replied}</p>
              <p className="text-xs text-gray-500">Antworten</p>
            </div>
          </div>

          <button
            onClick={handleStartCampaign}
            disabled={sendingCampaign || o.unsent === 0}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold text-base shadow-lg shadow-green-500/30 hover:shadow-green-500/50 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            title={`Jetzt manuell ${o.unsent} E-Mails mit der PartsUnion-Broschüre an unkontaktierte Leads versenden`}
          >
            {sendingCampaign ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                E-Mails werden versendet...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Kampagne starten ({o.unsent} E-Mails)
              </>
            )}
          </button>
        </div>

        {/* SMTP Info */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200">
          <h3 className="text-sm font-bold text-gray-700 mb-4">SMTP Konfiguration</h3>
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#7c3aed] to-[#a78bfa] rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900">info@partsunion.de</p>
                  <p className="text-xs text-gray-500">smtp.strato.de • Port 465</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-green-50 border border-green-100 text-center" title="Verschlüsselte Verbindung zum E-Mail-Server über SSL/TLS auf Port 465">
                <CheckCircle className="w-4 h-4 text-green-500 mx-auto mb-1" />
                <p className="text-xs font-bold text-green-700">SSL Aktiv</p>
              </div>
              <div className="p-3 rounded-xl bg-purple-50 border border-purple-100 text-center" title="SMTP-Zugangsdaten wurden erfolgreich geprüft — E-Mail-Versand funktioniert">
                <Zap className="w-4 h-4 text-purple-500 mx-auto mb-1" />
                <p className="text-xs font-bold text-purple-700">Verifiziert</p>
              </div>
            </div>

            {/* Niche Distribution */}
            {d.byNiche.length > 0 && (
              <div className="pt-3 border-t border-gray-100">
                <h4 className="text-xs font-bold text-gray-500 mb-3">Nischen-Verteilung</h4>
                <div className="space-y-2">
                  {d.byNiche.map((n, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-xs text-gray-600 truncate">{n.niche}</span>
                      <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">{n.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ BUNDESLÄNDER GRID ═══ */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900">🗺️ Bundesländer Coverage</h3>
            <p className="text-xs text-gray-500 mt-1">16 Bundesländer × 6 Nischen = {d.totalCombinations} Kombinationen</p>
          </div>
          <div className="px-3 py-1.5 bg-purple-100 rounded-lg">
            <span className="text-xs font-bold text-purple-700">{bundeslaender.length} Regionen</span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3">
          {bundeslaender.map((bl, i) => {
            const blStats = d.byBundesland?.find(b => b.bundesland === bl.name);
            const count = blStats?.count || 0;
            return (
              <button
                key={i}
                onClick={() => { setSelectedBundesland(bl.name); setManualMode(true); }}
                className={`p-4 rounded-xl border text-left transition-all hover:shadow-md hover:scale-[1.02] ${
                  selectedBundesland === bl.name
                    ? 'border-purple-400 bg-gradient-to-br from-purple-50 to-purple-100/50 shadow-md'
                    : 'border-gray-100 hover:border-purple-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <MapPin className={`w-4 h-4 ${selectedBundesland === bl.name ? 'text-purple-500' : 'text-gray-400'}`} />
                  {count > 0 && (
                    <span className="text-xs font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">{count}</span>
                  )}
                </div>
                <p className="text-sm font-bold text-gray-900 truncate">{bl.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{bl.cities?.length || bl.Städte?.length || 0} Städte</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Brochure Preview Modal */}
      {showBrochure && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowBrochure(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h3 className="font-bold text-gray-900">Broschüre Vorschau</h3>
                <p className="text-xs text-gray-500">PartsUnion E-Mail-Vorlage</p>
              </div>
              <button
                onClick={() => setShowBrochure(false)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <iframe
              src={brochureUrl}
              className="flex-1 w-full border-0 rounded-b-2xl"
              title="Broschüre Vorschau"
            />
          </div>
        </div>
      )}
    </div>
  );
}
