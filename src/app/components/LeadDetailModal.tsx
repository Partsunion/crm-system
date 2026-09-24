import { useState, useEffect } from 'react';
import { X, Mail, Phone, Building, User, Calendar, Edit, Trash2, Globe, MapPin, Tag as TagIcon, Plus, MessageSquare, PhoneCall, Video, FileText, CheckCircle, Clock } from 'lucide-react';
import { type Lead, type Activity, getActivities, saveActivity, deleteActivity } from '../utils/storage';

interface LeadDetailModalProps {
  lead: Lead;
  onClose: () => void;
  onEdit: (lead: Lead) => void;
  onDelete: () => void;
}

export function LeadDetailModal({ lead, onClose, onEdit, onDelete }: LeadDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'activities'>('details');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [newActivity, setNewActivity] = useState({
    type: 'note' as Activity['type'],
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  useEffect(() => {
    loadActivities();
  }, [lead.id]);

  const loadActivities = () => {
    setActivities(getActivities(lead.id));
  };

  const handleSaveActivity = () => {
    if (newActivity.title) {
      saveActivity({
        ...newActivity,
        leadId: lead.id,
      });
      loadActivities();
      setNewActivity({
        type: 'note',
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
      });
      setShowActivityForm(false);
    }
  };

  const handleToggleActivity = (activity: Activity) => {
    saveActivity({
      ...activity,
      completed: !activity.completed,
    });
    loadActivities();
  };

  const handleDeleteActivity = (id: string) => {
    if (confirm('Aktivität wirklich löschen?')) {
      deleteActivity(id);
      loadActivities();
    }
  };

  const statusColors: Record<string, string> = {
    'Neu': 'bg-blue-100 text-blue-700 border-blue-200',
    'Kontaktiert': 'bg-cyan-100 text-cyan-700 border-cyan-200',
    'Qualifiziert': 'bg-green-100 text-green-700 border-green-200',
    'Angebot': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'Verhandlung': 'bg-orange-100 text-orange-700 border-orange-200',
    'Gewonnen': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'Verloren': 'bg-red-100 text-red-700 border-red-200',
  };

  const priorityColors: Record<string, string> = {
    'Hoch': 'bg-red-100 text-red-700 border-red-200',
    'Mittel': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'Niedrig': 'bg-green-100 text-green-700 border-green-200',
  };

  const activityIcons = {
    call: <PhoneCall className="w-4 h-4" />,
    email: <Mail className="w-4 h-4" />,
    meeting: <Video className="w-4 h-4" />,
    note: <FileText className="w-4 h-4" />,
    task: <CheckCircle className="w-4 h-4" />,
  };

  const activityColors = {
    call: 'bg-blue-100 text-blue-700',
    email: 'bg-green-100 text-green-700',
    meeting: 'bg-purple-100 text-purple-700',
    note: 'bg-gray-100 text-gray-700',
    task: 'bg-orange-100 text-orange-700',
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-20 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto my-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-[#7c3aed] to-[#a78bfa] p-6 md:p-8 rounded-t-2xl sticky top-0 z-10">
          <div className="absolute top-6 right-6 flex items-center gap-2">
            <button
              onClick={() => onEdit(lead)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-[#7c3aed] rounded-xl transition-all hover:shadow-lg font-medium"
            >
              <Edit className="w-4 h-4" />
              <span className="hidden sm:inline">Bearbeiten</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-xl transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          <div className="flex items-start gap-5">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-2xl flex items-center justify-center shadow-xl flex-shrink-0">
              <span className="text-2xl md:text-3xl font-bold text-[#7c3aed]">{lead.company[0]}</span>
            </div>
            <div className="flex-1 min-w-0 pr-32">
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-2 truncate">{lead.company}</h3>
              <p className="text-purple-100 text-base md:text-lg mb-3">{lead.contactPerson}</p>
              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                <span className={`px-3 md:px-4 py-1.5 md:py-2 rounded-xl font-semibold border-2 text-xs md:text-sm ${statusColors[lead.status]}`}>
                  {lead.status}
                </span>
                {lead.priority && (
                  <span className={`px-3 md:px-4 py-1.5 md:py-2 rounded-xl font-semibold border-2 text-xs md:text-sm ${priorityColors[lead.priority]}`}>
                    {lead.priority}
                  </span>
                )}
                {(lead.designScore || lead.leadScore) ? (() => {
                  const score = lead.designScore || lead.leadScore || 0;
                  let scoreColor = 'bg-gray-500';
                  let scoreLabel = 'Score';
                  if (score >= 70) { scoreColor = 'bg-red-500'; scoreLabel = 'Schlecht'; }
                  else if (score >= 50) { scoreColor = 'bg-orange-500'; scoreLabel = 'Mäßig'; }
                  else if (score >= 30) { scoreColor = 'bg-yellow-500'; scoreLabel = 'OK'; }
                  else { scoreColor = 'bg-green-500'; scoreLabel = 'Gut'; }
                  return (
                    <span className={`px-3 md:px-4 py-1.5 md:py-2 ${scoreColor} text-white rounded-xl font-semibold text-xs md:text-sm`}>
                      🎯 {score}/100 • {scoreLabel}
                    </span>
                  );
                })() : null}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6 md:px-8">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-4 py-3 font-semibold transition-colors relative ${activeTab === 'details'
                  ? 'text-[#7c3aed]'
                  : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Details
              {activeTab === 'details' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7c3aed]"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('activities')}
              className={`px-4 py-3 font-semibold transition-colors relative ${activeTab === 'activities'
                  ? 'text-[#7c3aed]'
                  : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Aktivitäten ({activities.length})
              {activeTab === 'activities' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7c3aed]"></div>
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 max-h-[60vh] overflow-y-auto">
          {activeTab === 'details' ? (
            <div className="space-y-6 md:space-y-8">
              {/* Value Card */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-5 md:p-6 rounded-2xl border-2 border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium mb-1">Geschätzter Wert</p>
                    <p className="text-3xl md:text-4xl font-bold text-gray-900">€{lead.value?.toLocaleString() || '0'}</p>
                  </div>
                  {lead.nextFollowUpDate && (
                    <div className="text-right">
                      <p className="text-sm text-gray-600 font-medium mb-1">Nächstes Follow-up</p>
                      <p className="text-base md:text-lg font-semibold text-gray-900">
                        {new Date(lead.nextFollowUpDate).toLocaleDateString('de-DE')}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Contact Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-500 font-medium">Kontaktperson</p>
                    <p className="text-gray-900 font-semibold mt-1">{lead.contactPerson}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-500 font-medium">E-Mail</p>
                    <a href={`mailto:${lead.email}`} className="text-[#7c3aed] hover:text-[#6d28d9] font-semibold mt-1 block truncate">
                      {lead.email}
                    </a>
                  </div>
                </div>

                {lead.phone && (
                  <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                      <Phone className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-500 font-medium">Telefon</p>
                      <a href={`tel:${lead.phone}`} className="text-[#7c3aed] hover:text-[#6d28d9] font-semibold mt-1 block">
                        {lead.phone}
                      </a>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                    <Building className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-500 font-medium">Firma</p>
                    <p className="text-gray-900 font-semibold mt-1">{lead.company}</p>
                  </div>
                </div>

                {lead.website && (
                  <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                      <Globe className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-500 font-medium">Website</p>
                      <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-[#7c3aed] hover:text-[#6d28d9] font-semibold mt-1 block truncate">
                        {lead.website}
                      </a>
                    </div>
                  </div>
                )}

                {(lead.city || lead.country) && (
                  <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                      <MapPin className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-500 font-medium">Standort</p>
                      <p className="text-gray-900 font-semibold mt-1">
                        {lead.city}{lead.city && lead.country && ', '}{lead.country}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Additional Info */}
              {(lead.industry || lead.source || lead.assignedTo) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {lead.industry && (
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <p className="text-sm text-gray-500 font-medium mb-1">Branche</p>
                      <p className="text-gray-900 font-semibold">{lead.industry}</p>
                    </div>
                  )}
                  {lead.source && (
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <p className="text-sm text-gray-500 font-medium mb-1">Quelle</p>
                      <p className="text-gray-900 font-semibold">{lead.source}</p>
                    </div>
                  )}
                  {lead.assignedTo && (
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <p className="text-sm text-gray-500 font-medium mb-1">Zugewiesen an</p>
                      <p className="text-gray-900 font-semibold">{lead.assignedTo}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tags */}
              {lead.tags && lead.tags.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <TagIcon className="w-5 h-5 text-gray-500" />
                    <h4 className="font-bold text-gray-900">Tags</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {lead.tags.map(tag => (
                      <span key={tag} className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {lead.notes && (
                <div className="p-5 bg-gray-50 rounded-xl border border-gray-100">
                  <h4 className="font-bold text-gray-900 mb-3">Notizen</h4>
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{lead.notes}</p>
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>Erstellt: {new Date(lead.createdAt).toLocaleDateString('de-DE')}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>Aktualisiert: {new Date(lead.updatedAt).toLocaleDateString('de-DE')}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Add Activity Button */}
              <button
                onClick={() => setShowActivityForm(!showActivityForm)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-[#7c3aed] to-[#a78bfa] text-white rounded-xl hover:shadow-lg hover:shadow-purple-500/30 transition-all duration-200 font-medium"
              >
                <Plus className="w-5 h-5" />
                Neue Aktivität
              </button>

              {/* Activity Form */}
              {showActivityForm && (
                <div className="p-5 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Typ</label>
                      <select
                        value={newActivity.type}
                        onChange={(e) => setNewActivity({ ...newActivity, type: e.target.value as Activity['type'] })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7c3aed] focus:ring-opacity-20 focus:border-[#7c3aed] transition-all duration-200"
                      >
                        <option value="note">Notiz</option>
                        <option value="call">Anruf</option>
                        <option value="email">E-Mail</option>
                        <option value="meeting">Meeting</option>
                        <option value="task">Aufgabe</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Datum</label>
                      <input
                        type="date"
                        value={newActivity.date}
                        onChange={(e) => setNewActivity({ ...newActivity, date: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7c3aed] focus:ring-opacity-20 focus:border-[#7c3aed] transition-all duration-200"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Titel</label>
                    <input
                      type="text"
                      value={newActivity.title}
                      onChange={(e) => setNewActivity({ ...newActivity, title: e.target.value })}
                      placeholder="z.B. Follow-up Anruf"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7c3aed] focus:ring-opacity-20 focus:border-[#7c3aed] transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Beschreibung</label>
                    <textarea
                      value={newActivity.description}
                      onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                      rows={3}
                      placeholder="Details zur Aktivität..."
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7c3aed] focus:ring-opacity-20 focus:border-[#7c3aed] transition-all duration-200 resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowActivityForm(false)}
                      className="flex-1 px-4 py-2.5 text-gray-700 hover:bg-gray-200 rounded-xl transition-colors font-medium"
                    >
                      Abbrechen
                    </button>
                    <button
                      onClick={handleSaveActivity}
                      className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#7c3aed] to-[#a78bfa] text-white rounded-xl hover:shadow-lg transition-all font-medium"
                    >
                      Speichern
                    </button>
                  </div>
                </div>
              )}

              {/* Activities List */}
              <div className="space-y-3">
                {activities.map(activity => (
                  <div key={activity.id} className="p-4 bg-white rounded-xl border border-gray-200 hover:shadow-md transition-all">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 ${activityColors[activity.type]} rounded-xl flex items-center justify-center flex-shrink-0`}>
                        {activityIcons[activity.type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <h5 className="font-semibold text-gray-900">{activity.title}</h5>
                            <p className="text-sm text-gray-500">{new Date(activity.date).toLocaleDateString('de-DE')}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {activity.type === 'task' && (
                              <button
                                onClick={() => handleToggleActivity(activity)}
                                className={`p-1.5 rounded-lg transition-colors ${activity.completed
                                    ? 'bg-green-100 text-green-600'
                                    : 'bg-gray-100 text-gray-400 hover:bg-green-50 hover:text-green-600'
                                  }`}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteActivity(activity.id)}
                              className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        {activity.description && (
                          <p className="text-sm text-gray-600">{activity.description}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-2">von {activity.createdBy}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {activities.length === 0 && !showActivityForm && (
                  <div className="text-center py-12 text-gray-400">
                    <MessageSquare className="w-16 h-16 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">Noch keine Aktivitäten</p>
                    <p className="text-sm mt-1">Fügen Sie die erste Aktivität hinzu</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between p-6 md:p-8 border-t border-gray-200 bg-gray-50 rounded-b-2xl gap-3">
          <button
            onClick={onDelete}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 font-medium border-2 border-red-200 hover:border-red-300"
          >
            <Trash2 className="w-5 h-5" />
            Löschen
          </button>
          <button
            onClick={() => onEdit(lead)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#7c3aed] to-[#a78bfa] text-white rounded-xl hover:shadow-lg hover:shadow-purple-500/30 transition-all duration-200 font-medium"
          >
            <Edit className="w-5 h-5" />
            Bearbeiten
          </button>
        </div>
      </div>
    </div>
  );
}