import { notFound, redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getIsAppAdmin } from '@/lib/auth/app-admin';
import { PlayerEditForm } from '@/components/player/player-edit-form';

export const dynamic = 'force-dynamic';

export default async function EditPlayerPage({ params }: { params: { id: string } }) {
  const supabase = getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: player } = await supabase.from('players').select('*').eq('id', params.id).single();
  if (!player) notFound();

  const [isAdmin, { data: tm }, { data: groups }] = await Promise.all([
    getIsAppAdmin(),
    supabase.from('team_members').select('role').eq('team_id', player.team_id).eq('user_id', user.id).maybeSingle(),
    supabase.from('training_groups').select('id, name').order('name'),
  ]);
  const canEdit = isAdmin || ['manager', 'assistant'].includes((tm as any)?.role ?? '');
  if (!canEdit) redirect(`/players/${player.id}`);

  return <PlayerEditForm player={player} trainingGroups={groups ?? []} />;
}
