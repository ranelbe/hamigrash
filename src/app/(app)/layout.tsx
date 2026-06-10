import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getIsAppAdmin } from '@/lib/auth/app-admin';
import { AppShell } from '@/components/layout/app-shell';

export default async function AuthedLayout({ children }: { children: React.ReactNode }) {
  const supabase = getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // .maybeSingle() instead of .single() — single() throws PGRST116 if the
  // profile row hasn't been created yet (rare race after first Google
  // login). maybeSingle() returns null instead and we fall back to
  // user.email from the session.
  const [profileRes, isAdmin] = await Promise.all([
    supabase.from('profiles').select('email, full_name, avatar_url').eq('id', user.id).maybeSingle(),
    getIsAppAdmin().catch(() => false), // never let auth admin lookup take down the layout
  ]);
  const profile = profileRes.data;
  if (profileRes.error) console.error('[layout] profile lookup error', profileRes.error);

  return (
    <AppShell
      user={{ email: profile?.email ?? user.email!, name: profile?.full_name, avatar: profile?.avatar_url }}
      isAdmin={isAdmin}
    >
      {children}
    </AppShell>
  );
}
