import { useEffect, useState } from 'react';
import { Plus, RefreshCw, Users, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { getLeads, getTeamUsers, getTeams, saveTeam, getCurrentUser, type Lead, type User, type CrmTeam } from '../utils/storage';
import { Card, PageHeader, Button, Badge, EmptyState, Field, Modal, inputClass, SEITEN_RAND } from './ui-kit';
import { leadCategory } from '../utils/stages';
import { localDayKey } from '../utils/leadQuality';

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<CrmTeam[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [editing, setEditing] = useState<(Omit<CrmTeam, 'id'> & { id?: string }) | null>(null);
  const [saving, setSaving] = useState(false);
  const current = getCurrentUser();
  const canManage = current?.role === 'manager' || current?.app_access?.admin;
  async function load() {
    setLoading(true); setError(false);
    try { const [team, rows, groups] = await Promise.all([getTeamUsers(), getLeads(), getTeams()]); setUsers(team); setLeads(rows); setTeams(groups); }
    catch { setError(true); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  async function save() {
    if (!editing?.name.trim()) return;
    setSaving(true);
    try { await saveTeam(editing); setEditing(null); await load(); toast.success('Team gespeichert.'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Speichern fehlgeschlagen.'); }
    finally { setSaving(false); }
  }
  const today = localDayKey(new Date());
  const group = teams.find((team) => team.id === selectedTeam);
  const visible = group ? users.filter((user) => user.id && group.memberIds.includes(user.id)) : users;
  return <div className={SEITEN_RAND + ' space-y-5'}>
    <PageHeader title="Vertriebsteam" subtitle="CRM-Zugänge, Teams, Zuständigkeiten und aktuelle Arbeitslast." actions={<><Button variant="secondary" onClick={() => void load()} disabled={loading}><RefreshCw className="size-4" /> Aktualisieren</Button>{canManage && <Button onClick={() => setEditing({ name: '', description: '', active: true, memberIds: [] })}><Plus className="size-4" /> Team anlegen</Button>}</>} />
    <div className="flex flex-wrap gap-2"><button onClick={() => setSelectedTeam('all')} className={'rounded-md border px-3 py-2 text-sm ' + (selectedTeam === 'all' ? 'border-accent-500 text-accent-500' : 'border-border-subtle bg-surface')}>Alle Mitarbeiter · {users.length}</button>{teams.map((team) => <div key={team.id} className={'flex items-center rounded-md border bg-surface ' + (selectedTeam === team.id ? 'border-accent-500 text-accent-500' : 'border-border-subtle')}><button className="px-3 py-2 text-sm" onClick={() => setSelectedTeam(team.id)}>{team.name} · {team.memberIds.length}{!team.active && ' (inaktiv)'}</button>{canManage && <button className="px-2 py-2 text-text-muted hover:text-text-primary" aria-label={team.name + ' bearbeiten'} onClick={() => setEditing(team)}><Pencil className="size-3.5" /></button>}</div>)}</div>
    {group?.description && <p className="text-sm text-text-secondary">{group.description}</p>}
    <p className="text-sm text-text-secondary">Zugänge werden zentral freigegeben. Teammitgliedschaften organisieren die Zusammenarbeit und erteilen keine zusätzlichen Plattformrechte.</p>
    {error && <p className="text-sm text-status-danger" role="alert">Das Vertriebsteam konnte nicht geladen werden. Bitte erneut versuchen.</p>}
    <Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-elevated"><tr>{['Mitarbeiter', 'Rolle', 'Offene Leads', 'Fällige Wiedervorlagen', 'Ohne nächsten Schritt'].map((label) => <th className="px-5 py-4 text-left font-medium text-text-secondary" key={label}>{label}</th>)}</tr></thead><tbody>{visible.map((user) => {
      const owned = leads.filter((lead) => lead.assignedTo?.toLowerCase() === user.username.toLowerCase() && leadCategory(lead) === 'open');
      return <tr key={user.id || user.username} className="border-t border-border-subtle"><td className="px-5 py-4"><div className="font-medium">{user.name}</div><div className="mt-1 text-text-muted">{user.email || user.username}</div></td><td className="px-5 py-4"><Badge tone="neutral">{user.role === 'manager' ? 'Vertriebsleitung' : 'Vertrieb'}</Badge></td><td className="px-5 py-4 tabular-nums">{owned.length}</td><td className="px-5 py-4 tabular-nums">{owned.filter((lead) => lead.nextFollowUpDate && lead.nextFollowUpDate.slice(0, 10) <= today).length}</td><td className="px-5 py-4 tabular-nums">{owned.filter((lead) => !lead.nextFollowUpDate).length}</td></tr>;
    })}</tbody></table></div>{loading && <p role="status" className="p-5 text-sm text-text-muted">Team wird geladen…</p>}{!loading && !error && !visible.length && <EmptyState icon={<Users className="size-5" />} title="Keine Mitarbeiter in dieser Ansicht" description="Aktive CRM-Mitarbeiter können einem Team zugeordnet werden." />}</Card>
    <p className="text-sm text-text-muted">{leads.filter((lead) => !lead.assignedTo && leadCategory(lead) === 'open').length} offene Leads sind noch keinem Mitarbeiter zugewiesen. Die Zuweisung erfolgt in der Leadliste.</p>
    {editing && <Modal onClose={() => setEditing(null)} title={editing.id ? 'Team bearbeiten' : 'Team anlegen'} size="md" footer={<><Button variant="secondary" onClick={() => setEditing(null)} disabled={saving}>Abbrechen</Button><Button onClick={() => void save()} disabled={saving || !editing.name.trim()}>{saving ? 'Speichern…' : 'Team speichern'}</Button></>}>
      <div className="space-y-4"><Field label="Teamname" required><input className={inputClass} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field><Field label="Beschreibung"><textarea className={inputClass} rows={3} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></Field><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} /> Team aktiv</label><fieldset><legend className="mb-2 text-sm font-medium">Mitglieder</legend><div className="max-h-64 space-y-2 overflow-auto">{users.filter((user) => user.id).map((user) => <label className="flex items-center gap-3 rounded-md border border-border-subtle p-3" key={user.id}><input type="checkbox" checked={editing.memberIds.includes(user.id!)} onChange={(e) => setEditing({ ...editing, memberIds: e.target.checked ? [...editing.memberIds, user.id!] : editing.memberIds.filter((id) => id !== user.id) })} /><span className="text-sm">{user.name}<span className="ml-2 text-text-muted">{user.email}</span></span></label>)}</div></fieldset></div>
    </Modal>}
  </div>;
}
