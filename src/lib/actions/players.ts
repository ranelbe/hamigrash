'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseServerClient, requireCurrentUser } from '@/lib/supabase/server';
import { canCreatePlayer } from '@/lib/auth/capabilities';
import { playerCreateSchema, type PlayerCreateInput } from '@/lib/schemas';

// Translate the most common Postgres error messages to Hebrew so the
// user sees actionable feedback in the toast instead of cryptic SQL.
function humaniseDbError(err: { code?: string; message: string }): Error {
  // 23505 — unique_violation
  if (err.code === '23505') {
    if (err.message.includes('squad_number')) {
      return new Error('מספר חולצה זה כבר תפוס בקבוצה — בחר מספר אחר');
    }
    return new Error('הערך הזה כבר קיים במערכת — נסה ערך אחר');
  }
  return new Error(err.message);
}

export async function createPlayer(input: PlayerCreateInput) {
  await requireCurrentUser();
  if (!(await canCreatePlayer())) throw new Error('not_authorized');
  const parsed = playerCreateSchema.parse(input);
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from('players').insert(parsed).select('*').single();
  if (error) throw humaniseDbError(error);
  revalidatePath(`/teams/${parsed.team_id}`);
  return data;
}

export async function updatePlayer(playerId: string, input: Partial<PlayerCreateInput>) {
  await requireCurrentUser();
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from('players').update(input).eq('id', playerId);
  if (error) throw humaniseDbError(error);
  revalidatePath(`/players/${playerId}`);
}

export async function deletePlayer(playerId: string, teamId: string | null) {
  await requireCurrentUser();
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from('players').delete().eq('id', playerId);
  if (error) throw humaniseDbError(error);
  if (teamId) revalidatePath(`/teams/${teamId}`);
  revalidatePath('/players');
}
