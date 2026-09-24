import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff, Users as UsersIcon, Shield, UserCheck, UserX, X } from 'lucide-react';
import { getUsers, saveUser, deleteUser, getUserPassword, type User } from '../utils/storage';
import { CustomSelect } from './CustomSelect';

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    email: '',
    phone: '',
    role: 'Vertrieb',
    password: '',
    active: true,
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    setUsers(getUsers());
  };

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        name: user.name,
        email: user.email || '',
        phone: user.phone || '',
        role: user.role,
        password: '',
        active: user.active,
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: '',
        name: '',
        email: '',
        phone: '',
        role: 'Vertrieb',
        password: '',
        active: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.username || !formData.name) {
      alert('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }

    if (!editingUser && !formData.password) {
      alert('Bitte geben Sie ein Passwort ein');
      return;
    }

    saveUser(
      {
        username: formData.username,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        active: formData.active,
      },
      formData.password || undefined
    );

    loadUsers();
    setIsModalOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSave();
  };

  const handleDelete = (username: string) => {
    if (username === 'admin') {
      alert('Der Admin-Account kann nicht gelöscht werden');
      return;
    }
    
    if (confirm('Möchten Sie diesen Benutzer wirklich löschen?')) {
      deleteUser(username);
      loadUsers();
    }
  };

  const activeUsers = users.filter(u => u.active).length;
  const inactiveUsers = users.filter(u => !u.active).length;

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">Team-Verwaltung</h2>
          <p className="text-gray-500 mt-1 text-sm">Verwalten Sie Vertriebsmitarbeiter und Zugänge</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-[#7c3aed] text-white rounded-lg hover:bg-[#6d28d9] transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Neuer Benutzer
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">Alle Benutzer</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{users.length}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <UsersIcon className="w-6 h-6 text-[#7c3aed]" />
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">Aktiv</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{activeUsers}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">Inaktiv</p>
              <p className="text-2xl font-bold text-gray-400 mt-1">{inactiveUsers}</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <UserX className="w-6 h-6 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Benutzer</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Kontakt</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Rolle</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Benutzername</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.username} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${user.role === 'Admin' ? 'bg-gradient-to-br from-orange-500 to-red-500' : 'bg-gradient-to-br from-[#7c3aed] to-[#a78bfa]'} rounded-lg flex items-center justify-center shadow-sm`}>
                        {user.role === 'Admin' ? (
                          <Shield className="w-5 h-5 text-white" />
                        ) : (
                          <span className="text-white font-bold">{user.name[0]}</span>
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{user.name}</div>
                        {user.createdAt && (
                          <div className="text-xs text-gray-400">
                            Erstellt: {new Date(user.createdAt).toLocaleDateString('de-DE')}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      {user.email && (
                        <div className="text-sm text-gray-600">{user.email}</div>
                      )}
                      {user.phone && (
                        <div className="text-xs text-gray-500 mt-1">{user.phone}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                      user.role === 'Admin' 
                        ? 'bg-orange-100 text-orange-700' 
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                      user.active 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {user.active ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <code className="px-2 py-1 bg-gray-100 rounded text-sm text-gray-700 font-mono">
                      {user.username}
                    </code>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenModal(user)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Bearbeiten"
                      >
                        <Edit className="w-4 h-4 text-gray-600" />
                      </button>
                      {user.username !== 'admin' && (
                        <button
                          onClick={() => handleDelete(user.username)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          title="Löschen"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-[2px] flex items-start justify-center z-50 overflow-y-auto"
          onClick={() => setIsModalOpen(false)}
        >
          <div className="min-h-full w-full flex items-center justify-center p-4 py-8">
            <div 
              className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 md:p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl z-10">
                <div>
                  <h3 className="text-lg md:text-xl font-bold text-gray-900">
                    {editingUser ? 'Benutzer bearbeiten' : 'Neuer Benutzer'}
                  </h3>
                  <p className="text-gray-500 mt-1 text-sm">
                    {editingUser ? 'Bearbeiten Sie die Benutzerdaten' : 'Erstellen Sie einen neuen Vertriebsmitarbeiter'}
                  </p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-5 md:p-6 space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Basisinformationen</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Benutzername *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        disabled={!!editingUser}
                        placeholder="z.B. mschmidt"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7c3aed] focus:ring-opacity-20 focus:border-[#7c3aed] transition-all disabled:bg-gray-50 disabled:text-gray-500 text-sm"
                      />
                      {editingUser && (
                        <p className="text-xs text-gray-500 mt-1">Der Benutzername kann nicht geändert werden</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Vollständiger Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="z.B. Max Schmidt"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7c3aed] focus:ring-opacity-20 focus:border-[#7c3aed] transition-all text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        E-Mail
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="max@firma.de"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7c3aed] focus:ring-opacity-20 focus:border-[#7c3aed] transition-all text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Telefon
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+49 123 456789"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7c3aed] focus:ring-opacity-20 focus:border-[#7c3aed] transition-all text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Access Info */}
                <div className="space-y-4 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Zugangsdaten</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rolle *
                      </label>
                      <CustomSelect
                        value={formData.role}
                        onChange={(value) => setFormData({ ...formData, role: value })}
                        options={['Vertrieb', 'Admin', 'Manager']}
                        disabled={editingUser?.username === 'admin'}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Passwort {!editingUser && '*'}
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          placeholder={editingUser ? 'Leer lassen für keine Änderung' : 'Mindestens 6 Zeichen'}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7c3aed] focus:ring-opacity-20 focus:border-[#7c3aed] transition-all pr-10 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {editingUser && (
                        <p className="text-xs text-gray-500 mt-1">
                          Lassen Sie das Feld leer, um das Passwort nicht zu ändern
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-transparent rounded-lg border border-purple-100">
                    <input
                      type="checkbox"
                      id="active"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className="w-4 h-4 text-[#7c3aed] border-gray-300 rounded focus:ring-[#7c3aed]"
                    />
                    <label htmlFor="active" className="text-sm font-medium text-gray-700 cursor-pointer">
                      Benutzer ist aktiv und kann sich anmelden
                    </label>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#7c3aed] to-[#a78bfa] text-white rounded-lg hover:from-[#6d28d9] hover:to-[#9333ea] transition-all shadow-lg shadow-purple-500/30 font-medium text-sm"
                  >
                    {editingUser ? 'Speichern' : 'Benutzer erstellen'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}