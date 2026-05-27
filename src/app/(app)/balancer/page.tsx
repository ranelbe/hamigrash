import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getIsAppAdmin } from '@/lib/auth/app-admin';
import { BalancerWorkspace } from '@/components/balancer/workspace';

export const dynamic = 'force-dynamic';

export default async function BalancerPage() {
  const supabase = getSupabaseServerClient();
  const isAdmin = await getIsAppAdmin();

  // All active players visible to the user (RLS is public-read for players).
  const { data: players } = await supabase
    .from('players')
    .select('id, display_name, squad_number, position, team_id, training_group_id, training_group:training_groups(id, name), rating_pace, rating_shooting, rating_passing, rating_dribbling, rating_defending, rating_physical, rating_gk_diving, rating_gk_handling, rating_gk_kicking, rating_gk_reflexes, rating_gk_speed, rating_gk_positioning')
    .eq('is_active', true)
    .order('display_name');

  return <BalancerWorkspace players={players ?? []} isAdmin={isAdmin} />;
}
