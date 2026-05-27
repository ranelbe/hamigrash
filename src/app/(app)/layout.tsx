import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/layout/app-shell';

export default async function AuthedLayout({ children }: { children: React.ReactNode }) {
  const supabase = getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name, avatar_url')
    .eq('id', user.id)
    .single();

  return (
    <AppShell user={{ email: profile?.email ?? user.email!, name: profile?.full_name, avatar: profile?.avatar_url }}>
      {children}
    </AppShell>
  );
}
