'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseServerClient, requireCurrentUser } from '@/lib/supabase/server';
import { getIsAppAdmin } from '@/lib/auth/app-admin';
import { invitationCreateSchema, type InvitationCreateInput } from '@/lib/schemas';
import { sendInvitationEmail } from '@/lib/email';

export async function createInvitation(input: InvitationCreateInput) {
  const user = await requireCurrentUser();
  // Invitations are admin-only — only the app owner gatekeeps access.
  if (!(await getIsAppAdmin())) throw new Error('not_authorized');
  const parsed = invitationCreateSchema.parse(input);
  const supabase = getSupabaseServerClient();

  const insertable = {
    email: parsed.email.toLowerCase().trim(),
    kind: parsed.kind,
    team_id: parsed.team_id ?? null,
    competition_id: parsed.competition_id ?? null,
    match_id: parsed.match_id ?? null,
    team_role: parsed.team_role ?? null,
    competition_role: parsed.competition_role ?? null,
    match_role: parsed.match_role ?? null,
    invited_by: user.id,
    message: parsed.message ?? null,
  };

  const { data, error } = await supabase.from('invitations').insert(insertable).select('*').single();
  if (error) throw new Error(error.message);

  // Email is best-effort: if Resend isn't configured, or the send fails
  // for any reason, the invitation is still valid (the token is on the
  // row) and the admin can deliver it via WhatsApp / QR / copy-link.
  // Logging the error helps diagnose later without blocking the share UI.
  try {
    await sendInvitationEmail(data);
  } catch (e) {
    console.warn('[invitation] email send failed — invitation is still valid:', e);
  }

  revalidatePath('/invitations');
  return data;
}

export async function revokeInvitation(invitationId: string) {
  await requireCurrentUser();
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from('invitations').update({ status: 'revoked' }).eq('id', invitationId);
  if (error) throw new Error(error.message);
  revalidatePath('/invitations');
}

export async function acceptInvitationByToken(token: string) {
  await requireCurrentUser();
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.rpc('accept_invitation', { p_token: token });
  if (error) throw new Error(error.message);
  return data;
}

export async function claimMyPendingInvitations() {
  await requireCurrentUser();
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.rpc('claim_pending_invitations');
  if (error) throw new Error(error.message);
  return data as number;
}
