'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseServerClient, requireCurrentUser } from '@/lib/supabase/server';
import { canCreatePlayer } from '@/lib/auth/capabilities';
import { playerCreateSchema, type PlayerCreateInput } from '@/lib/schemas';

export async function createPlayer(input: PlayerCreateInput) {
  await requireCurrentUser();
  if (!(await canCreatePlayer())) throw new Error('not_authorized');
  const parsed = playerCreateSchema.parse(input);
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from('players').insert(parsed).select('*').single();
  if (error) throw new Error(error.message);
  revalidatePath(`/teams/${parsed.team_id}`);
  return data;
}

export async function updatePlayer(playerId: string, input: Partial<PlayerCreateInput>) {
  await requireCurrentUser();
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from('players').update(input).eq('id', playerId);
  if (error) throw new Error(error.message);
  revalidatePath(`/players/${playerId}`);
}

export async function deletePlayer(playerId: string, teamId: string) {
  await requireCurrentUser();
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from('players').delete().eq('id', playerId);
  if (error) throw new Error(error.message);
  revalidatePath(`/teams/${teamId}`);
}
