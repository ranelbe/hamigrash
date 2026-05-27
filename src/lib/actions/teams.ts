'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseServerClient, requireCurrentUser } from '@/lib/supabase/server';
import { getIsAppAdmin } from '@/lib/auth/app-admin';
import { teamCreateSchema, type TeamCreateInput } from '@/lib/schemas';

export async function createTeam(input: TeamCreateInput) {
  const user = await requireCurrentUser();
  if (!(await getIsAppAdmin())) throw new Error('not_authorized: app_admin required');
  const parsed = teamCreateSchema.parse(input);
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from('teams')
    .insert({ ...parsed, created_by: user.id })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  revalidatePath('/teams');
  return data;
}

export async function updateTeam(teamId: string, input: Partial<TeamCreateInput>) {
  await requireCurrentUser();
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from('teams').update(input).eq('id', teamId);
  if (error) throw new Error(error.message);
  revalidatePath(`/teams/${teamId}`);
}

export async function deleteTeam(teamId: string) {
  await requireCurrentUser();
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from('teams').delete().eq('id', teamId);
  if (error) throw new Error(error.message);
  revalidatePath('/teams');
}
