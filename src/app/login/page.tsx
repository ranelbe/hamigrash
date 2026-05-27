'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { he } from '@/lib/i18n/he';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

const MOCK_EMAILS: Record<string, string> = {
  admin: 'admin@test.com',
  manager: 'manager@test.com',
  organiser: 'organiser@test.com',
  viewer: 'viewer@test.com',
};
const MOCK_PASSWORD = 'Test1234!';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function loginAsMock(role: string) {
    setLoading(true);
    setError(null);
    const email = MOCK_EMAILS[role];
    if (!email) { setError('משתמש מוק לא תקין'); setLoading(false); return; }

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: MOCK_PASSWORD,
    });
    if (error) {
      setError(`שגיאה: ${error.message}`);
      setLoading(false);
      return;
    }
    window.location.href = '/dashboard';
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

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 text-start">
            {error}
          </div>
        )}

        {/* One-click mock-user login (dev/testing convenience) */}
        <div className="mt-6 pt-5 border-t border-ink-100">
          <p className="text-xs text-ink-500 mb-3">כניסה מהירה לבדיקה</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => loginAsMock('admin')} disabled={loading}
              className="rounded-lg ring-1 ring-ink-200 px-3 py-2 text-xs hover:bg-ink-50 hover:ring-pitch-300 transition-colors disabled:opacity-50">
              👑 אדמין
            </button>
            <button onClick={() => loginAsMock('manager')} disabled={loading}
              className="rounded-lg ring-1 ring-ink-200 px-3 py-2 text-xs hover:bg-ink-50 hover:ring-pitch-300 transition-colors disabled:opacity-50">
              🎽 מנהל קבוצה
            </button>
            <button onClick={() => loginAsMock('organiser')} disabled={loading}
              className="rounded-lg ring-1 ring-ink-200 px-3 py-2 text-xs hover:bg-ink-50 hover:ring-pitch-300 transition-colors disabled:opacity-50">
              🏆 מארגן תחרות
            </button>
            <button onClick={() => loginAsMock('viewer')} disabled={loading}
              className="rounded-lg ring-1 ring-ink-200 px-3 py-2 text-xs hover:bg-ink-50 hover:ring-pitch-300 transition-colors disabled:opacity-50">
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
