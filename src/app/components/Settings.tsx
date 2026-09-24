import { useState } from 'react';
import { Plus, X, Trash2, Save, Settings as SettingsIcon, Tag, Package, Briefcase } from 'lucide-react';
import { getSettings, saveSettings, type Settings as SettingsType } from '../utils/storage';

export function Settings() {
  const [settings, setSettings] = useState<SettingsType>(getSettings());
  const [newStatus, setNewStatus] = useState('');
  const [newSource, setNewSource] = useState('');
  const [newIndustry, setNewIndustry] = useState('');
  const [newTag, setNewTag] = useState('');

  const handleSave = () => {
    saveSettings(settings);
    alert('✅ Einstellungen erfolgreich gespeichert!');
  };

  const addStatus = () => {
    if (newStatus && !settings.statuses.includes(newStatus)) {
      setSettings(prev => ({
        ...prev,
        statuses: [...prev.statuses, newStatus]
      }));
      setNewStatus('');
    }
  };

  const removeStatus = (status: string) => {
    if (confirm(`Status "${status}" wirklich entfernen?`)) {
      setSettings(prev => ({
        ...prev,
        statuses: prev.statuses.filter(s => s !== status)
      }));
    }
  };

  const addSource = () => {
    if (newSource && !settings.sources.includes(newSource)) {
      setSettings(prev => ({
        ...prev,
        sources: [...prev.sources, newSource]
      }));
      setNewSource('');
    }
  };

  const removeSource = (source: string) => {
    if (confirm(`Quelle "${source}" wirklich entfernen?`)) {
      setSettings(prev => ({
        ...prev,
        sources: prev.sources.filter(s => s !== source)
      }));
    }
  };

  const addIndustry = () => {
    if (newIndustry && !settings.industries.includes(newIndustry)) {
      setSettings(prev => ({
        ...prev,
        industries: [...prev.industries, newIndustry]
      }));
      setNewIndustry('');
    }
  };

  const removeIndustry = (industry: string) => {
    if (confirm(`Branche "${industry}" wirklich entfernen?`)) {
      setSettings(prev => ({
        ...prev,
        industries: prev.industries.filter(i => i !== industry)
      }));
    }
  };

  const addTag = () => {
    if (newTag && !settings.tags.includes(newTag)) {
      setSettings(prev => ({
        ...prev,
        tags: [...prev.tags, newTag]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    if (confirm(`Tag "${tag}" wirklich entfernen?`)) {
      setSettings(prev => ({
        ...prev,
        tags: prev.tags.filter(t => t !== tag)
      }));
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Einstellungen</h2>
          <p className="text-gray-500 mt-1 text-sm md:text-base">Passen Sie Ihr CRM-System an Ihre Bedürfnisse an</p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center justify-center gap-2 px-5 py-3 md:px-6 md:py-3 bg-gradient-to-r from-[#7c3aed] to-[#a78bfa] text-white rounded-xl hover:shadow-lg hover:shadow-purple-500/30 transition-all duration-200 font-medium"
        >
          <Save className="w-4 h-4 md:w-5 md:h-5" />
          <span className="hidden sm:inline">Alle Einstellungen speichern</span>
          <span className="sm:hidden">Speichern</span>
        </button>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Status Settings */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20">
              <Tag className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Status-Optionen</h3>
              <p className="text-sm text-gray-500">Pipeline Status verwalten</p>
            </div>
          </div>
          
          <div className="space-y-3 mb-5">
            {settings.statuses.map((status, index) => (
              <div key={status} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200 hover:border-blue-300 transition-colors group">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </span>
                  <span className="text-gray-900 font-medium">{status}</span>
                </div>
                <button
                  onClick={() => removeStatus(status)}
                  className="p-2 hover:bg-red-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              placeholder="Neuer Status..."
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7c3aed] focus:ring-opacity-20 focus:border-[#7c3aed] transition-all duration-200"
              onKeyPress={(e) => e.key === 'Enter' && addStatus()}
            />
            <button
              onClick={addStatus}
              className="px-5 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-200"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Source Settings */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-md shadow-green-500/20">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Lead-Quellen</h3>
              <p className="text-sm text-gray-500">Herkunft der Leads</p>
            </div>
          </div>
          
          <div className="space-y-3 mb-5">
            {settings.sources.map((source, index) => (
              <div key={source} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-green-50 rounded-xl border border-gray-200 hover:border-green-300 transition-colors group">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 bg-green-100 text-green-700 rounded-lg flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </span>
                  <span className="text-gray-900 font-medium">{source}</span>
                </div>
                <button
                  onClick={() => removeSource(source)}
                  className="p-2 hover:bg-red-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newSource}
              onChange={(e) => setNewSource(e.target.value)}
              placeholder="Neue Quelle..."
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7c3aed] focus:ring-opacity-20 focus:border-[#7c3aed] transition-all duration-200"
              onKeyPress={(e) => e.key === 'Enter' && addSource()}
            />
            <button
              onClick={addSource}
              className="px-5 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:shadow-lg hover:shadow-green-500/30 transition-all duration-200"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Industries */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md shadow-purple-500/20">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Branchen</h3>
              <p className="text-sm text-gray-500">Branchen für Händler</p>
            </div>
          </div>
          
          <div className="space-y-3 mb-5">
            {settings.industries.map((industry, index) => (
              <div key={industry} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-purple-50 rounded-xl border border-gray-200 hover:border-purple-300 transition-colors group">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 bg-purple-100 text-purple-700 rounded-lg flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </span>
                  <span className="text-gray-900 font-medium">{industry}</span>
                </div>
                <button
                  onClick={() => removeIndustry(industry)}
                  className="p-2 hover:bg-red-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newIndustry}
              onChange={(e) => setNewIndustry(e.target.value)}
              placeholder="Neue Branche..."
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7c3aed] focus:ring-opacity-20 focus:border-[#7c3aed] transition-all duration-200"
              onKeyPress={(e) => e.key === 'Enter' && addIndustry()}
            />
            <button
              onClick={addIndustry}
              className="px-5 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:shadow-lg hover:shadow-purple-500/30 transition-all duration-200"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tags */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md shadow-orange-500/20">
              <Tag className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Tags</h3>
              <p className="text-sm text-gray-500">Lead-Tags verwalten</p>
            </div>
          </div>
          
          <div className="space-y-3 mb-5">
            {settings.tags.map((tag, index) => (
              <div key={tag} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-orange-50 rounded-xl border border-gray-200 hover:border-orange-300 transition-colors group">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 bg-orange-100 text-orange-700 rounded-lg flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </span>
                  <span className="text-gray-900 font-medium">{tag}</span>
                </div>
                <button
                  onClick={() => removeTag(tag)}
                  className="p-2 hover:bg-red-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Neues Tag..."
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7c3aed] focus:ring-opacity-20 focus:border-[#7c3aed] transition-all duration-200"
              onKeyPress={(e) => e.key === 'Enter' && addTag()}
            />
            <button
              onClick={addTag}
              className="px-5 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:shadow-lg hover:shadow-orange-500/30 transition-all duration-200"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Company Settings */}
      <div className="bg-white p-5 md:p-6 rounded-2xl border border-gray-200 hover:shadow-xl transition-all duration-300">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
          <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-md shadow-cyan-500/20">
            <SettingsIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Unternehmenseinstellungen</h3>
            <p className="text-sm text-gray-500">Allgemeine Konfiguration</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Firmenname
            </label>
            <input
              type="text"
              value={settings.companyName}
              onChange={(e) => setSettings(prev => ({ ...prev, companyName: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7c3aed] focus:ring-opacity-20 focus:border-[#7c3aed] transition-all duration-200"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Standard-Währung
            </label>
            <input
              type="text"
              value={settings.currency}
              onChange={(e) => setSettings(prev => ({ ...prev, currency: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7c3aed] focus:ring-opacity-20 focus:border-[#7c3aed] transition-all duration-200"
            />
          </div>
        </div>
      </div>

      {/* Save Button - Bottom */}
      <div className="flex justify-end pt-4">
        <button
          onClick={handleSave}
          className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 py-3 md:px-8 md:py-4 bg-gradient-to-r from-[#7c3aed] to-[#a78bfa] text-white rounded-xl hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-200 font-semibold text-base md:text-lg"
        >
          <Save className="w-5 h-5 md:w-6 md:h-6" />
          Alle Einstellungen speichern
        </button>
      </div>
    </div>
  );
}