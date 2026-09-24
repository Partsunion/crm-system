import { useEffect, useState } from 'react';
import { KeyRound, ArrowLeft } from 'lucide-react';
import { accountRequest } from '../utils/storage';
import { Button, Field, inputClass } from './ui-kit';

export function AccountRecovery({ forced = false, onDone }: { forced?: boolean; onDone: () => void }) {
  const [token, setToken] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('token') || new URLSearchParams(window.location.search).get('token') || '');
  const [identifier, setIdentifier] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [complete, setComplete] = useState(false);
  useEffect(() => {
    const receiveToken = () => {
      const next = new URLSearchParams(window.location.hash.slice(1)).get('token') || new URLSearchParams(window.location.search).get('token') || '';
      if (next && next !== token) { setToken(next); setComplete(false); setError(''); }
    };
    window.addEventListener('hashchange', receiveToken); window.addEventListener('popstate', receiveToken);
    return () => { window.removeEventListener('hashchange', receiveToken); window.removeEventListener('popstate', receiveToken); };
  }, [token]);
  const isPasswordChange = forced || Boolean(token);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (isPasswordChange && (password.length < 12 || password !== confirmation)) { setError('Bitte mindestens 12 Zeichen verwenden und das Passwort identisch bestätigen.'); return; }
    setBusy(true); setError('');
    try {
      await accountRequest(forced ? 'change-password' : token ? 'reset-password' : 'request-reset',
        forced ? { currentPassword, newPassword: password } : token ? { token, newPassword: password } : identifier.includes('@') ? { email: identifier.trim() } : { username: identifier.trim() });
      setComplete(true);
      if (token) window.history.replaceState(null, '', '/reset-password');
    } catch (e) { setError(e instanceof Error ? e.message : 'Bitte später erneut versuchen.'); }
    finally { setBusy(false); }
  }

  return <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
    <section className="w-full max-w-md rounded-lg border border-border-subtle bg-surface p-8">
      <div className="mb-6 flex items-center gap-3"><KeyRound className="size-5 text-accent-500" /><span className="font-semibold">Partsunion · CRM</span></div>
      <h1 className="text-2xl font-semibold text-text-primary">{isPasswordChange ? 'Neues Passwort festlegen' : 'Passwort zurücksetzen'}</h1>
      <p className="mb-6 mt-2 text-sm text-text-secondary">{forced ? 'Bitte ändere dein Passwort, bevor du mit dem CRM weiterarbeitest.' : 'Dein persönlicher Zugang zum Vertrieb.'}</p>
      {complete ? <div role="status" className="space-y-5 text-sm text-text-secondary">
        <p>{isPasswordChange ? 'Dein Passwort wurde geändert. Melde dich mit dem neuen Passwort an.' : 'Falls ein passendes Konto existiert, erhältst du einen Link zum Zurücksetzen. Prüfe auch deinen Spamordner.'}</p>
        <Button onClick={onDone}>Zur Anmeldung</Button>
      </div> : <form className="space-y-4" onSubmit={submit}>
        {!isPasswordChange && <Field label="Benutzername oder E-Mail" required><input autoComplete="username" required className={inputClass} value={identifier} onChange={(e) => setIdentifier(e.target.value)} /></Field>}
        {forced && <Field label="Aktuelles Passwort" required><input type="password" autoComplete="current-password" required className={inputClass} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} /></Field>}
        {isPasswordChange && <><Field label="Neues Passwort" hint="Mindestens 12 Zeichen. Eine lange, einzigartige Passphrase ist gut geeignet." required><input type="password" autoComplete="new-password" minLength={12} required className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          <Field label="Passwort bestätigen" required><input type="password" autoComplete="new-password" required className={inputClass} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} /></Field></>}
        {error && <p role="alert" className="text-sm text-status-danger">{error}</p>}
        <Button type="submit" disabled={busy} className="w-full">{busy ? 'Wird verarbeitet…' : isPasswordChange ? 'Passwort speichern' : 'Reset-Link anfordern'}</Button>
      </form>}
      {!forced && !complete && <button onClick={onDone} className="mt-6 inline-flex items-center gap-2 text-sm text-text-secondary"><ArrowLeft className="size-4" /> Zur Anmeldung</button>}
    </section>
  </main>;
}
