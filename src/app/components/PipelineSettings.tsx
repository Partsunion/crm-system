import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, GripVertical, Check, X } from 'lucide-react';
import { getSettings, saveSettings, type PipelineStage } from '../utils/storage';

const COLORS = [
  { name: 'blue', label: 'Blau', bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-700' },
  { name: 'cyan', label: 'Cyan', bg: 'bg-cyan-100', border: 'border-cyan-300', text: 'text-cyan-700' },
  { name: 'green', label: 'Grün', bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-700' },
  { name: 'yellow', label: 'Gelb', bg: 'bg-yellow-100', border: 'border-yellow-300', text: 'text-yellow-700' },
  { name: 'orange', label: 'Orange', bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-700' },
  { name: 'red', label: 'Rot', bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-700' },
  { name: 'purple', label: 'Lila', bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-700' },
  { name: 'pink', label: 'Pink', bg: 'bg-pink-100', border: 'border-pink-300', text: 'text-pink-700' },
  { name: 'emerald', label: 'Smaragd', bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-700' },
  { name: 'gray', label: 'Grau', bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-700' },
];

export function PipelineSettings() {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<PipelineStage | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    color: 'blue',
    probability: 50,
    isActive: true,
  });

  useEffect(() => {
    loadStages();
  }, []);

  const loadStages = () => {
    const settings = getSettings();
    setStages(settings.pipelineStages.sort((a, b) => a.order - b.order));
  };

  const handleOpenModal = (stage?: PipelineStage) => {
    if (stage) {
      setEditingStage(stage);
      setFormData({
        name: stage.name,
        color: stage.color,
        probability: stage.probability,
        isActive: stage.isActive,
      });
    } else {
      setEditingStage(null);
      setFormData({
        name: '',
        color: 'blue',
        probability: 50,
        isActive: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      alert('Bitte geben Sie einen Namen ein');
      return;
    }

    const settings = getSettings();
    
    if (editingStage) {
      // Update existing stage
      const updatedStages = settings.pipelineStages.map(s => 
        s.id === editingStage.id 
          ? { ...s, ...formData }
          : s
      );
      saveSettings({ ...settings, pipelineStages: updatedStages });
    } else {
      // Create new stage
      const newStage: PipelineStage = {
        id: crypto.randomUUID(),
        name: formData.name,
        color: formData.color,
        probability: formData.probability,
        order: settings.pipelineStages.length + 1,
        isActive: formData.isActive,
      };
      saveSettings({ 
        ...settings, 
        pipelineStages: [...settings.pipelineStages, newStage] 
      });
    }

    loadStages();
    setIsModalOpen(false);
  };

  const handleDelete = (stageId: string) => {
    if (confirm('Möchten Sie diese Pipeline-Stage wirklich löschen?')) {
      const settings = getSettings();
      const filteredStages = settings.pipelineStages.filter(s => s.id !== stageId);
      saveSettings({ ...settings, pipelineStages: filteredStages });
      loadStages();
    }
  };

  const handleToggleActive = (stageId: string) => {
    const settings = getSettings();
    const updatedStages = settings.pipelineStages.map(s => 
      s.id === stageId ? { ...s, isActive: !s.isActive } : s
    );
    saveSettings({ ...settings, pipelineStages: updatedStages });
    loadStages();
  };

  const moveStage = (index: number, direction: 'up' | 'down') => {
    const newStages = [...stages];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newStages.length) return;
    
    [newStages[index], newStages[targetIndex]] = [newStages[targetIndex], newStages[index]];
    
    // Update order
    const updatedStages = newStages.map((stage, idx) => ({
      ...stage,
      order: idx + 1,
    }));
    
    const settings = getSettings();
    saveSettings({ ...settings, pipelineStages: updatedStages });
    loadStages();
  };

  const getColorStyles = (colorName: string) => {
    return COLORS.find(c => c.name === colorName) || COLORS[0];
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">Pipeline-Stages</h2>
          <p className="text-gray-500 mt-1 text-sm">Verwalten Sie Ihre Pipeline-Phasen und deren Reihenfolge</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-[#7c3aed] text-white rounded-lg hover:bg-[#6d28d9] transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Neue Stage
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500 font-medium">Alle Stages</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stages.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500 font-medium">Aktiv</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{stages.filter(s => s.isActive).length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500 font-medium">Inaktiv</p>
          <p className="text-2xl font-bold text-gray-400 mt-1">{stages.filter(s => !s.isActive).length}</p>
        </div>
      </div>

      {/* Stages List */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Pipeline-Stages</h3>
          <p className="text-sm text-gray-500 mt-1">Ziehen Sie Stages nach oben oder unten, um die Reihenfolge zu ändern</p>
        </div>
        
        <div className="divide-y divide-gray-100">
          {stages.map((stage, index) => {
            const colorStyles = getColorStyles(stage.color);
            return (
              <div
                key={stage.id}
                className={`p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors ${!stage.isActive ? 'opacity-50' : ''}`}
              >
                {/* Drag Handle */}
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => moveStage(index, 'up')}
                    disabled={index === 0}
                    className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <GripVertical className="w-4 h-4 text-gray-400 rotate-90" />
                  </button>
                  <button
                    onClick={() => moveStage(index, 'down')}
                    disabled={index === stages.length - 1}
                    className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <GripVertical className="w-4 h-4 text-gray-400 -rotate-90" />
                  </button>
                </div>

                {/* Order Number */}
                <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  <span className="text-sm font-bold text-gray-700">{stage.order}</span>
                </div>

                {/* Color Badge */}
                <div className={`w-20 h-10 ${colorStyles.bg} border-2 ${colorStyles.border} rounded-lg`} />

                {/* Stage Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900">{stage.name}</div>
                  <div className="text-sm text-gray-500">
                    Wahrscheinlichkeit: {stage.probability}%
                  </div>
                </div>

                {/* Status Badge */}
                <div>
                  <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                    stage.isActive 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {stage.isActive ? 'Aktiv' : 'Inaktiv'}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(stage.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      stage.isActive 
                        ? 'hover:bg-gray-100' 
                        : 'hover:bg-green-50'
                    }`}
                    title={stage.isActive ? 'Deaktivieren' : 'Aktivieren'}
                  >
                    {stage.isActive ? (
                      <X className="w-4 h-4 text-gray-600" />
                    ) : (
                      <Check className="w-4 h-4 text-green-600" />
                    )}
                  </button>
                  <button
                    onClick={() => handleOpenModal(stage)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Bearbeiten"
                  >
                    <Edit className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    onClick={() => handleDelete(stage.id)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    title="Löschen"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stage Modal */}
      {isModalOpen && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 transition-opacity"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl transform transition-all animate-in fade-in slide-in-from-bottom-4 duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-6 py-5 border-b border-gray-200">
                  <h3 className="text-xl font-bold text-gray-900">
                    {editingStage ? 'Stage bearbeiten' : 'Neue Stage erstellen'}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Definieren Sie eine neue Phase in Ihrer Verkaufs-Pipeline
                  </p>
                </div>

                <div className="px-6 py-5 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Stage-Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#7c3aed] focus:ring-opacity-20 focus:border-[#7c3aed] transition-all"
                      placeholder="z.B. Erstkontakt, Demo geplant, ..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Farbe
                    </label>
                    <div className="grid grid-cols-5 gap-3">
                      {COLORS.map((color) => (
                        <button
                          key={color.name}
                          onClick={() => setFormData({ ...formData, color: color.name })}
                          className={`h-12 ${color.bg} border-2 ${
                            formData.color === color.name 
                              ? `${color.border} ring-2 ring-[#7c3aed] ring-offset-2` 
                              : 'border-gray-200'
                          } rounded-lg transition-all hover:scale-105`}
                          title={color.label}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Abschlusswahrscheinlichkeit: {formData.probability}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="10"
                      value={formData.probability}
                      onChange={(e) => setFormData({ ...formData, probability: parseInt(e.target.value) })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#7c3aed]"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>0%</span>
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4 text-[#7c3aed] border-gray-300 rounded focus:ring-[#7c3aed]"
                    />
                    <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                      Stage ist aktiv
                    </label>
                  </div>
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 rounded-b-2xl">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-[#7c3aed] text-white rounded-lg hover:bg-[#6d28d9] transition-colors font-medium"
                  >
                    {editingStage ? 'Speichern' : 'Stage erstellen'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
