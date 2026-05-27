'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseServerClient, requireCurrentUser } from '@/lib/supabase/server';
import { getIsAppAdmin } from '@/lib/auth/app-admin';
import { trainingGroupSchema, type TrainingGroupInput } from '@/lib/schemas';

export async function createTrainingGroup(input: TrainingGroupInput) {
  const user = await requireCurrentUser();
  if (!(await getIsAppAdmin())) throw new Error('not_authorized: app_admin required');
  const parsed = trainingGroupSchema.parse(input);
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('training_groups')
    .insert({ ...parsed, created_by: user.id })
    .select('*').single();
  if (error) throw new Error(error.code === '23505' ? 'קבוצה בשם הזה כבר קיימת' : error.message);
  revalidatePath('/training-groups');
  return data;
}

export async function updateTrainingGroup(id: string, input: TrainingGroupInput) {
  await requireCurrentUser();
  if (!(await getIsAppAdmin())) throw new Error('not_authorized');
  const parsed = trainingGroupSchema.parse(input);
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from('training_groups').update(parsed).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/training-groups');
}

export async function deleteTrainingGroup(id: string) {
  await requireCurrentUser();
  if (!(await getIsAppAdmin())) throw new Error('not_authorized');
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from('training_groups').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/training-groups');
}
