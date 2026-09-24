import { useEffect, useState } from 'react';
import { ShieldCheck, Copy, KeyRound } from 'lucide-react';
import { accountRequest, mfaRequest, getCurrentUser } from '../utils/storage';
import { Button, Field, inputClass, PageHeader, SEITEN_RAND } from './ui-kit';
import { LoadError } from './LoadError';

export function AccountSecurity({ onPasswordChanged }: { onPasswordChanged: () => void }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState<{ area: string; message: string } | null>(null);
  const [notice, setNotice] = useState('');
  const [password, setPassword] = useState('');
  const [enrollment, setEnrollment] = useState<{ secret: string; otpauth_url: string } | null>(null);
  const [code, setCode] = useState('');
  const [backups, setBackups] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  async function load() { setLoadError(false); try { setEnabled((await mfaRequest<{ enabled: boolean }>()).enabled); } catch { setLoadError(true); } }
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    const unsaved = backups.length > 0 && !saved;
    const warn = (event: BeforeUnloadEvent) => { if (unsaved) { event.preventDefault(); event.returnValue = ''; } };
    const leave = (event: Event) => { if (unsaved && !window.confirm('Die Wiederherstellungscodes werden nur einmal angezeigt. Ohne Sicherung verlassen?')) event.preventDefault(); };
    window.addEventListener('beforeunload', warn); window.addEventListener('crm:navigation-check', leave);
    return () => { window.removeEventListener('beforeunload', warn); window.removeEventListener('crm:navigation-check', leave); };
  }, [backups, saved]);
  async function run(area: string, action: () => Promise<void>) { if (busy) return; setBusy(area); setError(null); try { await action(); } catch (err) { setError({ area, message: err instanceof Error ? err.message : 'Bitte erneut versuchen.' }); } finally { setBusy(''); } }
  async function copy(value: string) { try { await navigator.clipboard.writeText(value); setNotice('Kopiert. Bitte in einem sicheren Passwortmanager aufbewahren.'); } catch { setNotice('Kopieren nicht möglich. Bitte den angezeigten Text manuell sichern.'); } }
  return <div className={SEITEN_RAND + ' space-y-6'}>
    <PageHeader title="Kontosicherheit" subtitle={`Persönlicher CRM-Zugang · ${getCurrentUser()?.username || ''}`} />
    <div className="grid items-start gap-6 xl:grid-cols-2">
      <section className="rounded-lg border border-border-subtle bg-surface p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold"><ShieldCheck className="size-5" />Zwei-Faktor-Anmeldung</h2>
        <p className="mt-2 text-sm leading-6 text-text-secondary">Schütze deinen Zugang mit einem zusätzlichen Code aus einer Authenticator-App. Du benötigst dafür keinen Admin-Zugang.</p>
        {loadError ? <div className="mt-4"><LoadError message="Sicherheitsstatus konnte nicht geladen werden." onRetry={() => void load()} /></div> : enabled === null ? <p role="status" className="mt-4 text-sm">Sicherheitsstatus wird geprüft…</p> : <>
          <p className="my-5 flex items-center gap-2 border-y border-border-subtle py-3 text-sm"><span className={'size-2 rounded-full ' + (enabled ? 'bg-status-success' : 'bg-status-warning')} />{enabled ? 'Zwei-Faktor-Anmeldung aktiviert' : 'Noch nicht eingerichtet'}</p>
          {!enabled && !enrollment && <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void run('mfa', async () => { setEnrollment(await mfaRequest('enroll', { password })); setPassword(''); }); }}>
            <Field label="Aktuelles Passwort bestätigen" required><input className={inputClass} type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></Field>
            <Button type="submit" disabled={Boolean(busy) || !password}>{busy === 'mfa' ? 'Wird vorbereitet…' : 'Authenticator einrichten'}</Button>
          </form>}
          {!enabled && enrollment && <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void run('mfa', async () => { const result = await mfaRequest<{ enabled: boolean; backup_codes: string[] }>('confirm', { code }); setEnabled(result.enabled); setBackups(result.backup_codes); setEnrollment(null); setCode(''); }); }}>
            <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-text-secondary"><li>In deiner Authenticator-App ein zeitbasiertes Konto hinzufügen.</li><li>Diesen Einrichtungsschlüssel eintragen.</li><li>Mit dem aktuellen sechsstelligen Code bestätigen.</li></ol>
            <code className="block break-all rounded-md border border-border-subtle bg-elevated p-3 text-sm" aria-label="Einrichtungsschlüssel">{enrollment.secret}</code><Button type="button" variant="secondary" onClick={() => void copy(enrollment.secret)}><Copy className="size-4" />Schlüssel kopieren</Button>
            <Field label="Code aus der Authenticator-App" required><input className={inputClass} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} /></Field>
            <Button type="submit" disabled={Boolean(busy) || code.length !== 6}>Aktivierung bestätigen</Button>
          </form>}
          {enabled && !backups.length && <p className="text-sm leading-6 text-text-secondary">Beim nächsten Login wird dein Sicherheitscode abgefragt. Bei Verlust der App kannst du einen deiner einmaligen Wiederherstellungscodes nutzen.</p>}
        </>}
        {backups.length > 0 && <div className="mt-5 space-y-3"><h3 className="font-semibold">Wiederherstellungscodes sichern</h3><p className="text-sm leading-6 text-text-secondary">Diese Codes werden nur jetzt angezeigt. Jeder Code ist einmal verwendbar. Nicht per E-Mail oder Chat weitergeben.</p><div className="grid grid-cols-2 gap-2 rounded-md border border-border-subtle bg-elevated p-3">{backups.map((value) => <code className="text-sm" key={value}>{value}</code>)}</div><Button variant="secondary" onClick={() => void copy(backups.join('\n'))}>Codes kopieren</Button><label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={saved} onChange={(event) => setSaved(event.target.checked)} />Ich habe die Codes sicher aufbewahrt.</label><Button variant="secondary" disabled={!saved} onClick={() => setBackups([])}>Codes ausblenden</Button></div>}
        {error?.area === 'mfa' && <p role="alert" className="mt-4 text-sm text-status-danger">{error.message}</p>}
        {notice && <p role="status" className="mt-4 text-sm text-text-secondary">{notice}</p>}
      </section>
      <section className="rounded-lg border border-border-subtle bg-surface p-5"><h2 className="flex items-center gap-2 text-base font-semibold"><KeyRound className="size-5" />Passwort ändern</h2><p className="mt-2 text-sm leading-6 text-text-secondary">Mindestens 12 Zeichen. Danach meldest du dich mit deinem neuen Passwort erneut an.</p>
        <form className="mt-5 space-y-4" onSubmit={(event) => { event.preventDefault(); if (next.length < 12 || next !== repeat) { setError({ area: 'password', message: 'Mindestens 12 Zeichen verwenden und identisch bestätigen.' }); return; } void run('password', async () => { await accountRequest('change-password', { currentPassword: current, newPassword: next }); setCurrent(''); setNext(''); setRepeat(''); onPasswordChanged(); }); }}>
          <Field label="Aktuelles Passwort" required><input type="password" autoComplete="current-password" className={inputClass} value={current} onChange={(event) => setCurrent(event.target.value)} required /></Field>
          <Field label="Neues Passwort" required><input type="password" autoComplete="new-password" minLength={12} className={inputClass} value={next} onChange={(event) => setNext(event.target.value)} required /></Field>
          <Field label="Neues Passwort bestätigen" required><input type="password" autoComplete="new-password" className={inputClass} value={repeat} onChange={(event) => setRepeat(event.target.value)} required /></Field>
          {repeat && repeat !== next && <p className="text-sm text-status-danger">Die Passwörter stimmen noch nicht überein.</p>}
          {error?.area === 'password' && <p role="alert" className="text-sm text-status-danger">{error.message}</p>}
          <Button type="submit" disabled={Boolean(busy) || !current || next.length < 12 || next !== repeat}>Passwort ändern</Button>
        </form>
      </section>
    </div>
  </div>;
}
