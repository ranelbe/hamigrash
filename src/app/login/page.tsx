'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { he } from '@/lib/i18n/he';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function signInWithGoogle() {
    setLoading(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();
    const next = new URLSearchParams(window.location.search).get('next') ?? '/dashboard';
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) { setError(error.message); setLoading(false); }
  }

  async function signInWithEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    const next = new URLSearchParams(window.location.search).get('next') ?? '/dashboard';
    window.location.href = next;
  }

  function quickLogin(email: string) {
    setEmail(email);
    setPassword('Test1234!');
    setShowEmail(true);
  }

  return (
    <div className="min-h-screen grid place-items-center px-6 bg-gradient-to-b from-white to-pitch-50">
      <div className="w-full max-w-md rounded-xl2 bg-white p-8 shadow-cardLg border border-ink-100 text-center">
        <div className="mx-auto size-12 rounded-2xl bg-pitch-600 text-white text-2xl grid place-items-center mb-4">⚽</div>
        <h1 className="font-display text-2xl font-bold text-ink-900">{he.auth.welcome}</h1>
        <p className="mt-2 text-sm text-ink-600">התחברות באמצעות Google — בלי סיסמאות.</p>

        <Button onClick={signInWithGoogle} fullWidth size="lg" loading={loading} className="mt-6">
          <GoogleIcon />
          {loading ? he.auth.signingIn : he.auth.google}
        </Button>

        {/* Divider */}
        <div className="flex items-center gap-2 my-5">
          <div className="flex-1 h-px bg-ink-200" />
          <span className="text-xs text-ink-400">או</span>
          <div className="flex-1 h-px bg-ink-200" />
        </div>

        {!showEmail ? (
          <button onClick={() => setShowEmail(true)} className="text-sm text-pitch-700 hover:underline">
            התחברות עם אימייל וסיסמה
          </button>
        ) : (
          <form onSubmit={signInWithEmail} className="space-y-3 text-start">
            <div>
              <label className="block text-xs font-medium text-ink-600 mb-1">אימייל</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full h-10 px-3 rounded-xl ring-1 ring-ink-200 focus:ring-pitch-500 focus:outline-none text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-600 mb-1">סיסמה</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className="w-full h-10 px-3 rounded-xl ring-1 ring-ink-200 focus:ring-pitch-500 focus:outline-none text-sm" />
            </div>
            <Button type="submit" fullWidth loading={loading}>התחברות</Button>
          </form>
        )}

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {/* Mock-user quick-login chips (dev convenience) */}
        <div className="mt-6 pt-5 border-t border-ink-100">
          <p className="text-xs text-ink-500 mb-2">משתמשי בדיקה (סיסמה: Test1234!)</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => quickLogin('admin@test.com')} className="rounded-lg ring-1 ring-ink-200 px-3 py-2 text-xs hover:bg-ink-50">
              👑 אדמין
            </button>
            <button onClick={() => quickLogin('manager@test.com')} className="rounded-lg ring-1 ring-ink-200 px-3 py-2 text-xs hover:bg-ink-50">
              🎽 מנהל קבוצה
            </button>
            <button onClick={() => quickLogin('organiser@test.com')} className="rounded-lg ring-1 ring-ink-200 px-3 py-2 text-xs hover:bg-ink-50">
              🏆 מארגן תחרות
            </button>
            <button onClick={() => quickLogin('viewer@test.com')} className="rounded-lg ring-1 ring-ink-200 px-3 py-2 text-xs hover:bg-ink-50">
              👀 צופה רגיל
            </button>
          </div>
        </div>

        <p className="mt-6 text-xs text-ink-400">
          ההתחברות אינה מקנה הרשאות. גישה מוקנית באמצעות הזמנות בלבד.
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path fill="#EA4335" d="M12 11v3.2h5.06c-.21 1.3-1.49 3.82-5.06 3.82-3.05 0-5.54-2.52-5.54-5.62S8.95 6.78 12 6.78c1.74 0 2.9.74 3.57 1.38l2.43-2.34C16.42 4.5 14.4 3.6 12 3.6 7.45 3.6 3.8 7.25 3.8 11.4S7.45 19.2 12 19.2c6.92 0 8.4-5.96 7.83-9.2H12z" />
    </svg>
  );
}
