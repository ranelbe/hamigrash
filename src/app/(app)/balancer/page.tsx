import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getIsAppAdmin } from '@/lib/auth/app-admin';
import { BalancerWorkspace } from '@/components/balancer/workspace';

export const dynamic = 'force-dynamic';

// v2 — hard-cast to any to defeat Supabase's array widening of to-one joins.
export default async function BalancerPage() {
  const supabase = getSupabaseServerClient();
  const isAdmin = await getIsAppAdmin();

  const result = await supabase
    .from('players')
    .select('id, display_name, squad_number, position, team_id, training_group_id, training_group:training_groups(id, name), rating_pace, rating_shooting, rating_passing, rating_dribbling, rating_defending, rating_physical, rating_gk_diving, rating_gk_handling, rating_gk_kicking, rating_gk_reflexes, rating_gk_speed, rating_gk_positioning')
    .eq('is_active', true)
    .order('display_name');

  // Supabase widens to-one joins as arrays — normalise to single object.
  const raw = (result.data ?? []) as any[];
  const players = raw.map(p => ({
    ...p,
    training_group: Array.isArray(p.training_group) ? (p.training_group[0] ?? null) : (p.training_group ?? null),
  }));

  return <BalancerWorkspace players={players as any} isAdmin={isAdmin} />;
}
