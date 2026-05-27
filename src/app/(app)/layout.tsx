import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getIsAppAdmin } from '@/lib/auth/app-admin';
import { AppShell } from '@/components/layout/app-shell';

export default async function AuthedLayout({ children }: { children: React.ReactNode }) {
  const supabase = getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: profile }, isAdmin] = await Promise.all([
    supabase.from('profiles').select('email, full_name, avatar_url').eq('id', user.id).single(),
    getIsAppAdmin(),
  ]);

  return (
    <AppShell
      user={{ email: profile?.email ?? user.email!, name: profile?.full_name, avatar: profile?.avatar_url }}
      isAdmin={isAdmin}
    >
      {children}
    </AppShell>
  );
}
