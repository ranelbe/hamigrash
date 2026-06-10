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

  // Email is now optional. Persisting NULL when blank so we can
  // distinguish "admin chose not to auto-send" from "admin typed something".
  const cleanEmail = parsed.email ? parsed.email.toLowerCase().trim() : null;

  const insertable = {
    email: cleanEmail || null,
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

  // Best-effort auto-send via Resend. Only attempted if the admin
  // actually supplied an email — otherwise the link travels via
  // WhatsApp / copy / QR exclusively.
  let emailSent = false;
  let emailError: string | null = null;
  if (cleanEmail) {
    try {
      await sendInvitationEmail(data);
      emailSent = true;
    } catch (e: any) {
      emailError = e?.message ?? String(e);
      console.warn('[invitation] email send failed — invitation is still valid:', emailError);
    }
  }

  revalidatePath('/invitations');
  // The form reads emailSent off this returned object to decide which
  // UI state to render. The DB row is preserved untouched as `invitation`.
  return { ...data, emailSent, emailError } as typeof data & { emailSent: boolean; emailError: string | null };
}

export async function revokeInvitation(invitationId: string) {
  await requireCurrentUser();
  if (!(await getIsAppAdmin())) throw new Error('not_authorized');
  const supabase = getSupabaseServerClient();
  // .select() so we can detect RLS-silently-blocked writes (returns
  // 0 rows without raising). Without it, the UI thinks the action
  // succeeded when nothing actually happened.
  const { data, error } = await supabase.from('invitations')
    .update({ status: 'revoked' })
    .eq('id', invitationId)
    .select('id');
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error('הביטול נחסם — אין הרשאת RLS לעדכון השורה');
  revalidatePath('/invitations');
}

// Hard-delete the invitation row. Doesn't touch any access already
// granted from an earlier acceptance — use revokeAcceptedAccess for that.
export async function deleteInvitation(invitationId: string) {
  await requireCurrentUser();
  if (!(await getIsAppAdmin())) throw new Error('not_authorized');
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from('invitations')
    .delete()
    .eq('id', invitationId)
    .select('id');
  if (error) throw new Error(error.message);
  if (!data?.length) {
    // Either RLS denied silently, the row doesn't exist, or migration
    // 0027 (the DELETE policy) hasn't been applied yet.
    throw new Error('המחיקה נחסמה — ודא שמיגרציה 0027 רצה ב-DB');
  }
  revalidatePath('/invitations');
}

// For an ACCEPTED invitation: remove the role row that was inserted at
// accept time (team_members / competition_members / match_officials),
// then mark the invitation as 'revoked' so it's clear in the audit log.
// Other roles the user may have via OTHER invitations are unaffected.
export async function revokeAcceptedAccess(invitationId: string) {
  await requireCurrentUser();
  if (!(await getIsAppAdmin())) throw new Error('not_authorized');
  const supabase = getSupabaseServerClient();

  const { data: inv, error: fetchErr } = await supabase
    .from('invitations')
    .select('id, kind, status, accepted_by, team_id, competition_id, match_id')
    .eq('id', invitationId)
    .single();
  if (fetchErr || !inv) throw new Error('invitation_not_found');
  if (inv.status !== 'accepted') throw new Error('not_accepted');
  if (!inv.accepted_by) throw new Error('no_grantee_on_record');

  if (inv.kind === 'team' && inv.team_id) {
    const { error } = await supabase.from('team_members')
      .delete()
      .eq('team_id', inv.team_id).eq('user_id', inv.accepted_by);
    if (error) throw new Error(`team_member_remove_failed: ${error.message}`);
  } else if (inv.kind === 'competition' && inv.competition_id) {
    const { error } = await supabase.from('competition_members')
      .delete()
      .eq('competition_id', inv.competition_id).eq('user_id', inv.accepted_by);
    if (error) throw new Error(`competition_member_remove_failed: ${error.message}`);
  } else if (inv.kind === 'match_official' && inv.match_id) {
    const { error } = await supabase.from('match_officials')
      .delete()
      .eq('match_id', inv.match_id).eq('user_id', inv.accepted_by);
    if (error) throw new Error(`match_official_remove_failed: ${error.message}`);
  }

  // Flip status to 'revoked' so the row stays as an audit trail
  // (admins can see 'gave access then took it back').
  await supabase.from('invitations').update({ status: 'revoked' }).eq('id', invitationId);

  revalidatePath('/invitations');
  // Also bust the cache for the entity whose membership we just changed,
  // plus dashboards (where 'בניהול שלי' is computed off memberships).
  if (inv.team_id) revalidatePath(`/teams/${inv.team_id}`);
  if (inv.competition_id) revalidatePath(`/competitions/${inv.competition_id}`);
  revalidatePath('/dashboard');
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
