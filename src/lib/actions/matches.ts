'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseServerClient, requireCurrentUser } from '@/lib/supabase/server';
import { canCreateMatch } from '@/lib/auth/capabilities';
import { matchCreateSchema, matchEventSchema, type MatchCreateInput, type MatchEventInput } from '@/lib/schemas';

export async function createMatch(input: MatchCreateInput) {
  const user = await requireCurrentUser();
  if (!(await canCreateMatch())) throw new Error('not_authorized');
  const parsed = matchCreateSchema.parse(input);
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('matches')
    .insert({ ...parsed, created_by: user.id })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  revalidatePath('/matches');
  return data;
}

// Retro entry: writes one goal event per team, no players, no minutes. Source-of-truth preserved.
export async function enterFinalScore(matchId: string, homeGoals: number, awayGoals: number) {
  const user = await requireCurrentUser();
  const supabase = getSupabaseServerClient();
  const { data: m, error: me } = await supabase
    .from('matches')
    .select('*, competition:competitions(type)')
    .eq('id', matchId)
    .single();
  if (me || !m) throw new Error(me?.message ?? 'match_not_found');

  // Cup matches cannot end in a tie — there must be a winner so the
  // bracket can advance. Block the save with a Hebrew message instead
  // of letting the bad score land in the DB.
  const comp: any = Array.isArray((m as any).competition) ? (m as any).competition[0] : (m as any).competition;
  if (comp?.type === 'cup' && homeGoals === awayGoals) {
    throw new Error('משחק גביע לא יכול להסתיים בתיקו — צריך מנצח (תוצאת פנדלים / הארכה).');
  }

  const events = [
    ...Array.from({ length: homeGoals }, () => ({
      match_id: matchId, team_id: m.home_team_id, event_type: 'goal' as const, period: 1, minute: 0, extra_minute: 0, payload: { retro: true }, recorded_by: user.id, client_id: crypto.randomUUID(),
    })),
    ...Array.from({ length: awayGoals }, () => ({
      match_id: matchId, team_id: m.away_team_id, event_type: 'goal' as const, period: 1, minute: 0, extra_minute: 0, payload: { retro: true }, recorded_by: user.id, client_id: crypto.randomUUID(),
    })),
    // Final period_end so triggers flip status to 'finished'.
    {
      match_id: matchId, team_id: null, event_type: 'period_end' as const,
      period: m.number_of_periods, minute: m.period_length_min, extra_minute: 0,
      payload: { retro: true }, recorded_by: user.id, client_id: crypto.randomUUID(),
    },
  ];

  const { error: ie } = await supabase.from('match_events').insert(events);
  if (ie) throw new Error(ie.message);
  revalidatePath(`/matches/${matchId}`);
}

// Live event recording. Idempotent on client_id.
export async function recordMatchEvent(input: MatchEventInput) {
  const user = await requireCurrentUser();
  const parsed = matchEventSchema.parse(input);
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from('match_events')
    .upsert(
      { ...parsed, recorded_by: user.id },
      { onConflict: 'client_id', ignoreDuplicates: false },
    );
  if (error) throw new Error(error.message);
  revalidatePath(`/matches/${parsed.match_id}`);
}

export async function cancelMatchEvent(eventId: string, matchId: string) {
  await requireCurrentUser();
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from('match_events').update({ is_cancelled: true }).eq('id', eventId);
  if (error) throw new Error(error.message);
  revalidatePath(`/matches/${matchId}`);
}

// Re-open a finished match so the score can be re-entered. Marks every
// event as cancelled (preserved for audit) and flips status back to
// 'scheduled'. Doesn't touch lineups, officials, or scheduling.
export async function reopenMatch(matchId: string) {
  await requireCurrentUser();
  const supabase = getSupabaseServerClient();

  // 1. Cancel every event — match_scores is a view that recomputes
  //    from match_events, so this also zeros the score automatically.
  const { error: ce } = await supabase
    .from('match_events')
    .update({ is_cancelled: true })
    .eq('match_id', matchId);
  if (ce) throw new Error(`reopen_cancel_events_failed: ${ce.message}`);

  // 2. Reset the match itself.
  const { error: ue } = await supabase
    .from('matches')
    .update({ status: 'scheduled', started_at: null, finished_at: null })
    .eq('id', matchId);
  if (ue) throw new Error(`reopen_match_update_failed: ${ue.message}`);

  revalidatePath(`/matches/${matchId}`);
}

export async function updateMatch(matchId: string, input: Partial<MatchCreateInput> & { status?: 'scheduled' | 'live' | 'finished' | 'cancelled' }) {
  await requireCurrentUser();
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from('matches').update(input).eq('id', matchId);
  if (error) throw new Error(error.message);
  revalidatePath(`/matches/${matchId}`);
  revalidatePath('/matches');
}

export async function deleteMatch(matchId: string) {
  await requireCurrentUser();
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from('matches').delete().eq('id', matchId);
  if (error) throw new Error(error.message);
  revalidatePath('/matches');
}

export async function setLineup(matchId: string, teamId: string, players: { player_id: string; is_starter: boolean; shirt_number?: number | null }[]) {
  await requireCurrentUser();
  const supabase = getSupabaseServerClient();
  // Replace lineup for that team in this match.
  const { error: de } = await supabase.from('match_lineups').delete().eq('match_id', matchId).eq('team_id', teamId);
  if (de) throw new Error(de.message);
  if (players.length === 0) return;
  const rows = players.map(p => ({ match_id: matchId, team_id: teamId, ...p }));
  const { error: ie } = await supabase.from('match_lineups').insert(rows);
  if (ie) throw new Error(ie.message);
  revalidatePath(`/matches/${matchId}`);
}
