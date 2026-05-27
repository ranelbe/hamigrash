import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getIsAppAdmin } from './app-admin';

// Anything a brand-new, never-invited user is NOT allowed to do.
// Centralised so UI hiding and server-action guards stay in sync.

export async function canCreateMatch(): Promise<boolean> {
  if (await getIsAppAdmin()) return true;
  const supabase = getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const [{ count: tm }, { count: co }] = await Promise.all([
    supabase.from('team_members').select('*', { count: 'exact', head: true })
      .eq('user_id', user.id).in('role', ['manager', 'assistant']),
    supabase.from('competition_members').select('*', { count: 'exact', head: true })
      .eq('user_id', user.id).in('role', ['organiser', 'admin']),
  ]);
  return (tm ?? 0) > 0 || (co ?? 0) > 0;
}

export async function canCreatePlayer(): Promise<boolean> {
  if (await getIsAppAdmin()) return true;
  const supabase = getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { count } = await supabase.from('team_members').select('*', { count: 'exact', head: true })
    .eq('user_id', user.id).in('role', ['manager', 'assistant']);
  return (count ?? 0) > 0;
}

export async function canInvite(): Promise<boolean> {
  if (await getIsAppAdmin()) return true;
  const supabase = getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const [{ count: tm }, { count: co }] = await Promise.all([
    supabase.from('team_members').select('*', { count: 'exact', head: true })
      .eq('user_id', user.id).in('role', ['manager', 'assistant']),
    supabase.from('competition_members').select('*', { count: 'exact', head: true })
      .eq('user_id', user.id).in('role', ['organiser', 'admin']),
  ]);
  return (tm ?? 0) > 0 || (co ?? 0) > 0;
}
