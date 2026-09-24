import { useState } from 'react';
import { LogIn, AlertCircle, Sparkles } from 'lucide-react';
import { login } from '../utils/storage';

interface LoginProps {
  onLogin: () => void;
}

export function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      const user = login(username, password);

      if (user) {
        onLogin();
      } else {
        setError('Ungültige Anmeldedaten. Bitte versuchen Sie es erneut.');
      }

      setLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#7c3aed] via-[#a78bfa] to-[#7c3aed] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-2xl shadow-purple-900/50 mb-6">
            <Sparkles className="w-10 h-10 text-[#7c3aed]" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">PartsUnion CRM</h1>
          <p className="text-purple-100">Melden Sie sich an, um fortzufahren</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl animate-in fade-in slide-in-from-top-2 duration-200">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Username */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Benutzername
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Ihr Benutzername"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7c3aed] focus:ring-opacity-20 focus:border-[#7c3aed] transition-all duration-200"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Passwort
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Ihr Passwort"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7c3aed] focus:ring-opacity-20 focus:border-[#7c3aed] transition-all duration-200"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#7c3aed] to-[#a78bfa] text-white rounded-xl hover:shadow-lg hover:shadow-purple-500/30 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Anmeldung läuft...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Anmelden</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-purple-100 text-sm mt-6">
          © 2026 PartsUnion CRM. Alle Rechte vorbehalten.
        </p>
      </div>
    </div>
  );
}
