import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getIsAppAdmin } from '@/lib/auth/app-admin';
import { TrainingGroupsManager } from './_manager';

export const dynamic = 'force-dynamic';

export default async function TrainingGroupsPage() {
  const isAdmin = await getIsAppAdmin();
  if (!isAdmin) redirect('/dashboard');

  const supabase = getSupabaseServerClient();
  const [{ data: groups }, { data: players }] = await Promise.all([
    supabase.from('training_groups').select('*').order('name'),
    supabase.from('players').select('training_group_id').eq('is_active', true),
  ]);

  // Count players per group
  const counts = new Map<string, number>();
  for (const p of (players ?? []) as any[]) {
    if (p.training_group_id) counts.set(p.training_group_id, (counts.get(p.training_group_id) ?? 0) + 1);
  }
  const groupsWithCounts = (groups ?? []).map(g => ({ ...g, playerCount: counts.get(g.id) ?? 0 }));

  return <TrainingGroupsManager initialGroups={groupsWithCounts} />;
}
