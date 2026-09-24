import { useState, useEffect } from 'react';
import { Plus, Search, Filter, MoreVertical, Edit, Trash2, Eye, Download, Mail, Phone, Upload, ArrowUpDown, ArrowUp, ArrowDown, User, Clock, Calendar, Globe, ExternalLink, Star } from 'lucide-react';
import { getLeads, saveLead, deleteLead, getUsers, type Lead } from '../utils/storage';
import { LeadModal } from './LeadModal';
import { LeadDetailModal } from './LeadDetailModal';
import { ImportModal } from './ImportModal';
import { CustomSelect } from './CustomSelect';

// Score color helper
const getScoreColor = (score: number | undefined): { bg: string; text: string; label: string } => {
  if (!score || score === 0) return { bg: 'bg-gray-100', text: 'text-gray-500', label: 'N/A' };
  if (score >= 70) return { bg: 'bg-red-100', text: 'text-red-700', label: 'Schlecht' };
  if (score >= 50) return { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Mäßig' };
  if (score >= 30) return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'OK' };
  return { bg: 'bg-green-100', text: 'text-green-700', label: 'Gut' };
};

export function LeadsView() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [assignedToFilter, setAssignedToFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'company' | 'createdAt' | 'value' | 'updatedAt'>('updatedAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    const data = await getLeads();
    setLeads(data);
  };

  const handleSaveLead = async (lead: Partial<Lead>) => {
    await saveLead(lead);
    await loadLeads();
    setIsModalOpen(false);
    setEditingLead(null);
  };

  const handleDeleteLead = async (id: string) => {
    if (confirm('Möchten Sie diesen Lead wirklich löschen?')) {
      await deleteLead(id);
      await loadLeads();
      setOpenMenuId(null);
    }
  };

  const handleEditClick = (lead: Lead) => {
    setEditingLead(lead);
    setIsModalOpen(true);
    setOpenMenuId(null);
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Get unique users for filter
  const users = getUsers();
  const assignedUsers = ['Alle Benutzer', ...Array.from(new Set(leads.map(l => l.assignedTo).filter(Boolean)))];

  const filteredLeads = leads
    .filter((lead) => {
      const matchesSearch =
        lead.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.phone && lead.phone.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || lead.priority === priorityFilter;
      const matchesAssignedTo = assignedToFilter === 'all' || lead.assignedTo === assignedToFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesAssignedTo;
    })
    .sort((a, b) => {
      let comparison = 0;

      if (sortField === 'company') {
        comparison = a.company.localeCompare(b.company);
      } else if (sortField === 'createdAt') {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortField === 'updatedAt') {
        comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      } else if (sortField === 'value') {
        comparison = (a.value || 0) - (b.value || 0);
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

  const formatRelativeTime = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

    if (seconds < 60) return 'Gerade eben';
    if (seconds < 3600) return `vor ${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `vor ${Math.floor(seconds / 3600)}h`;
    if (seconds < 604800) return `vor ${Math.floor(seconds / 86400)}d`;
    return then.toLocaleDateString('de-DE');
  };

  const statusColors: Record<string, string> = {
    'Neu': 'bg-blue-100 text-blue-700',
    'Qualifiziert': 'bg-green-100 text-green-700',
    'Angebot': 'bg-yellow-100 text-yellow-700',
    'Verhandlung': 'bg-orange-100 text-orange-700',
    'Gewonnen': 'bg-emerald-100 text-emerald-700',
    'Verloren': 'bg-red-100 text-red-700',
  };

  const priorityColors: Record<string, string> = {
    'Hoch': 'bg-red-100 text-red-700',
    'Mittel': 'bg-yellow-100 text-yellow-700',
    'Niedrig': 'bg-green-100 text-green-700',
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">Leads</h2>
          <p className="text-gray-500 mt-1 text-sm">Verwalten Sie Ihre Leads und Kontakte</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-3 py-2 text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Importieren</span>
          </button>
          <button className="flex items-center gap-2 px-3 py-2 text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button
            onClick={() => {
              setEditingLead(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#7c3aed] text-white rounded-lg hover:bg-[#6d28d9] transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Neuer Lead</span>
            <span className="sm:hidden">Neu</span>
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500 font-medium">Alle Leads</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{leads.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500 font-medium">Qualifiziert</p>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {leads.filter(l => l.status === 'Qualifiziert').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500 font-medium">Verhandlung</p>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {leads.filter(l => l.status === 'Verhandlung').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500 font-medium">Gewonnen</p>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {leads.filter(l => l.status === 'Gewonnen').length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Suche nach Firma, Kontakt oder E-Mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#7c3aed] focus:ring-opacity-20 focus:border-[#7c3aed] transition-all text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <div className="w-48">
              <CustomSelect
                value={statusFilter === 'all' ? 'Alle Status' : statusFilter}
                onChange={(value) => setStatusFilter(value === 'Alle Status' ? 'all' : value)}
                options={['Alle Status', 'Neu', 'Qualifiziert', 'Angebot', 'Verhandlung', 'Gewonnen', 'Verloren']}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <div className="w-48">
              <CustomSelect
                value={priorityFilter === 'all' ? 'Alle Prioritäten' : priorityFilter}
                onChange={(value) => setPriorityFilter(value === 'Alle Prioritäten' ? 'all' : value)}
                options={['Alle Prioritäten', 'Hoch', 'Mittel', 'Niedrig']}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <div className="w-48">
              <CustomSelect
                value={assignedToFilter === 'all' ? 'Alle Benutzer' : assignedToFilter}
                onChange={(value) => setAssignedToFilter(value === 'Alle Benutzer' ? 'all' : value)}
                options={assignedUsers}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">Firma</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">Kontakt</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700 text-center">Score</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">Quelle</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">Aktualisiert</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLeads.map((lead) => {
                const score = lead.designScore || lead.leadScore;
                const scoreStyle = getScoreColor(score);
                return (
                  <tr
                    key={lead.id}
                    onClick={() => setDetailLead(lead)}
                    className="hover:bg-purple-50/50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#7c3aed] to-[#a78bfa] rounded-lg flex items-center justify-center shadow-sm shadow-purple-500/20 flex-shrink-0">
                          <span className="text-white font-bold">{lead.company[0]}</span>
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 truncate max-w-[200px]">{lead.company}</div>
                          <div className="text-xs text-gray-500 truncate max-w-[200px]">{lead.industry || lead.niche || 'Keine Branche'}</div>
                          {(lead.website || lead.websiteUrl) && (
                            <a
                              href={lead.website || lead.websiteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1 mt-0.5 truncate max-w-[200px]"
                            >
                              <Globe className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{(lead.website || lead.websiteUrl || '').replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        {lead.contactPerson && (
                          <div className="text-gray-900 font-medium text-sm truncate max-w-[180px]">{lead.contactPerson}</div>
                        )}
                        {lead.email && lead.email !== 'nicht gefunden' && (
                          <a
                            href={`mailto:${lead.email}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-gray-600 hover:text-purple-600 flex items-center gap-1 truncate max-w-[180px]"
                          >
                            <Mail className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{lead.email}</span>
                          </a>
                        )}
                        {lead.phone && (
                          <a
                            href={`tel:${lead.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-gray-600 hover:text-purple-600 flex items-center gap-1"
                          >
                            <Phone className="w-3 h-3 flex-shrink-0" />
                            <span>{lead.phone}</span>
                          </a>
                        )}
                        {(lead.city || lead.address) && (
                          <div className="text-xs text-gray-400 truncate max-w-[180px]">
                            {lead.city || lead.address}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {score ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${scoreStyle.bg} ${scoreStyle.text}`}>
                            {score}/100
                          </span>
                          <span className="text-[10px] text-gray-500">{scoreStyle.label}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${statusColors[lead.status]}`}>
                          {lead.status}
                        </span>
                        {lead.priority && (
                          <span className={`block px-2.5 py-1 rounded-lg text-xs font-medium ${priorityColors[lead.priority]} w-fit`}>
                            {lead.priority}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <span className="text-sm font-medium text-gray-900">{lead.source}</span>
                        {lead.value && lead.value > 0 && (
                          <p className="text-xs text-gray-500 mt-0.5">€{lead.value.toLocaleString()}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>{formatRelativeTime(lead.updatedAt)}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredLeads.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <Search className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">Keine Leads gefunden</p>
              <p className="text-sm mt-1">Versuchen Sie es mit anderen Suchkriterien</p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {filteredLeads.map((lead) => (
          <div key={lead.id} className="bg-white p-4 rounded-xl border border-gray-200 active:bg-gray-50">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-[#7c3aed] to-[#a78bfa] rounded-lg flex items-center justify-center shadow-sm shadow-purple-500/20 flex-shrink-0">
                <span className="text-white font-bold text-lg">{lead.company[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">{lead.company}</h3>
                <p className="text-sm text-gray-500 truncate">{lead.contactPerson}</p>
                <p className="text-xs text-gray-400 truncate mt-1">{lead.email}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${statusColors[lead.status]}`}>
                {lead.status}
              </span>
              {lead.priority && (
                <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${priorityColors[lead.priority]}`}>
                  {lead.priority}
                </span>
              )}
              <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium">
                {lead.source}
              </span>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <span className="font-semibold text-gray-900">€{lead.value?.toLocaleString() || '0'}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDetailLead(lead)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors active:scale-95"
                >
                  <Eye className="w-5 h-5 text-gray-500" />
                </button>
                <button
                  onClick={() => handleEditClick(lead)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors active:scale-95"
                >
                  <Edit className="w-5 h-5 text-gray-500" />
                </button>
                <button
                  onClick={() => handleDeleteLead(lead.id)}
                  className="p-2 hover:bg-red-50 rounded-lg transition-colors active:scale-95"
                >
                  <Trash2 className="w-5 h-5 text-red-500" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredLeads.length === 0 && (
          <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-200">
            <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">Keine Leads gefunden</p>
            <p className="text-sm mt-1">Versuchen Sie andere Suchkriterien</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {filteredLeads.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between bg-white p-4 md:p-5 rounded-xl border border-gray-200 gap-3">
          <p className="text-xs md:text-sm text-gray-600">
            Zeige <span className="font-semibold">{filteredLeads.length}</span> von <span className="font-semibold">{leads.length}</span> Leads
          </p>
          <div className="flex items-center gap-2">
            <button className="px-3 py-2 md:px-4 md:py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              Zurück
            </button>
            <button className="px-3 py-2 md:px-4 md:py-2 text-sm font-medium text-white bg-gradient-to-r from-[#7c3aed] to-[#a78bfa] rounded-lg hover:shadow-lg hover:shadow-purple-500/30 transition-all duration-200">
              Weiter
            </button>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {isImportModalOpen && (
        <ImportModal
          onClose={() => setIsImportModalOpen(false)}
          onImport={loadLeads}
        />
      )}

      {/* Lead Modal */}
      {isModalOpen && (
        <LeadModal
          lead={editingLead}
          onClose={() => {
            setIsModalOpen(false);
            setEditingLead(null);
          }}
          onSave={handleSaveLead}
        />
      )}

      {/* Detail Modal */}
      {detailLead && (
        <LeadDetailModal
          lead={detailLead}
          onClose={() => setDetailLead(null)}
          onEdit={(lead) => {
            setDetailLead(null);
            setEditingLead(lead);
            setIsModalOpen(true);
          }}
          onDelete={() => {
            handleDeleteLead(detailLead.id);
            setDetailLead(null);
          }}
        />
      )}
    </div>
  );
}