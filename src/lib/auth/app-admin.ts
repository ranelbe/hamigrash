import { getSupabaseServerClient } from '@/lib/supabase/server';

// Returns true if the current user is a platform admin (row in app_admins).
// Cached per-request because Next.js can call it from multiple components.
export async function getIsAppAdmin(): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from('app_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();
  return !!data;
}
