'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseServerClient, requireCurrentUser } from '@/lib/supabase/server';
import { getIsAppAdmin } from '@/lib/auth/app-admin';

// Hebrew round labels matching the balancer's generator. Kept in sync.
function cupRoundLabel(round: number, totalRounds: number, hasByes: boolean): string {
  if (hasByes && round === 0) return 'סיבוב מקדים';
  const fromFinal = totalRounds - 1 - round;
  switch (fromFinal) {
    case 0: return 'גמר';
    case 1: return 'חצי גמר';
    case 2: return 'רבע גמר';
    case 3: return 'שמינית גמר';
    case 4: return 'שישית עשרה גמר';
    default: return `סיבוב ${round + 1}`;
  }
}

/**
 * Build the next cup round from the previous round's winners.
 *
 * Looks at all finished matches whose round_label belongs to the current
 * "deepest" round in this competition, figures out the winners from
 * match_scores, pairs them in bracket order, and inserts the next round.
 *
 * Safe to call multiple times — no-ops if the next round already exists
 * or if the previous round isn't fully finished.
 */
export async function generateNextCupRound(competitionId: string): Promise<{
  ok: true; created: number; nextRoundLabel: string;
} | { ok: false; reason: string }> {
  await requireCurrentUser();
  const supabase = getSupabaseServerClient();

  // Permission gate — only admin or competition organiser can advance the bracket.
  const isAdmin = await getIsAppAdmin();
  if (!isAdmin) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, reason: 'not_authenticated' };
    const { count } = await supabase.from('competition_members')
      .select('*', { count: 'exact', head: true })
      .eq('competition_id', competitionId).eq('user_id', user.id)
      .in('role', ['organiser', 'admin']);
    if ((count ?? 0) === 0) return { ok: false, reason: 'not_authorized' };
  }

  // 1. Get the competition + count enrolled teams (drives totalRounds + hasByes).
  const { data: comp } = await supabase.from('competitions').select('id, type, format').eq('id', competitionId).single();
  if (!comp) return { ok: false, reason: 'competition_not_found' };
  if (comp.type !== 'cup') return { ok: false, reason: 'not_a_cup' };

  const { count: teamCount } = await supabase.from('competition_teams')
    .select('*', { count: 'exact', head: true }).eq('competition_id', competitionId);
  const totalCupRounds = Math.ceil(Math.log2(teamCount ?? 2));

  // 2. Inspect existing matches grouped by round_label.
  const { data: existingMatches } = await supabase
    .from('matches')
    .select('id, round_label, status, scheduled_at, home_team_id, away_team_id')
    .eq('competition_id', competitionId)
    .order('scheduled_at', { ascending: true });
  const matches = existingMatches ?? [];

  // The labels we WILL use, in order from deepest to final.
  // Compute hasByes from round-0 size relative to ideal first-round size.
  const round0Count = matches.filter(m => {
    // round 0 has the earliest scheduled_at
    return m.round_label === cupRoundLabel(0, totalCupRounds, false)
        || m.round_label === cupRoundLabel(0, totalCupRounds, true);
  }).length;
  const idealRound0 = Math.floor((teamCount ?? 0) / 2);
  const hasByes = round0Count > 0 && round0Count < idealRound0;

  // Find the deepest round that exists.
  let deepestRound = -1;
  for (let r = 0; r < totalCupRounds; r++) {
    const label = cupRoundLabel(r, totalCupRounds, hasByes);
    if (matches.some(m => m.round_label === label)) deepestRound = r;
  }
  if (deepestRound < 0) return { ok: false, reason: 'no_round_0' };
  if (deepestRound >= totalCupRounds - 1) return { ok: false, reason: 'cup_already_finished' };

  const currentLabel = cupRoundLabel(deepestRound, totalCupRounds, hasByes);
  const nextLabel    = cupRoundLabel(deepestRound + 1, totalCupRounds, hasByes);

  // If the next round already exists, nothing to do.
  if (matches.some(m => m.round_label === nextLabel)) {
    return { ok: false, reason: 'next_round_already_exists' };
  }

  // 3. Make sure every current-round match is finished.
  const currentRoundMatches = matches.filter(m => m.round_label === currentLabel);
  if (currentRoundMatches.some(m => m.status !== 'finished')) {
    return { ok: false, reason: 'current_round_not_finished' };
  }

  // 4. Pull scores to determine winners.
  const ids = currentRoundMatches.map(m => m.id);
  const { data: scores } = await supabase
    .from('match_scores').select('match_id, home_goals, away_goals').in('match_id', ids);
  const scoreMap = new Map<string, { home_goals: number; away_goals: number }>();
  for (const s of (scores ?? []) as any[]) scoreMap.set(s.match_id, s);

  // 5. Determine the entrants for the NEXT round.
  //    For round 0 with byes: bye teams + round-0 winners advance to round 1.
  //    For later rounds: previous round's winners advance.
  //    We use competition_teams ordering as the seed order so byes are
  //    reproducible.
  const { data: enrol } = await supabase
    .from('competition_teams')
    .select('team_id, joined_at')
    .eq('competition_id', competitionId)
    .order('joined_at', { ascending: true });
  const seedOrder = (enrol ?? []).map((r: any) => r.team_id);

  // Set of teams that played in the current round (so we can deduce who got a bye)
  const playedTeams = new Set<string>();
  for (const m of currentRoundMatches) {
    if (m.home_team_id) playedTeams.add(m.home_team_id);
    if (m.away_team_id) playedTeams.add(m.away_team_id);
  }
  const winners: string[] = [];
  for (const m of currentRoundMatches) {
    const s = scoreMap.get(m.id);
    if (!s) return { ok: false, reason: `no_score_for_match_${m.id}` };
    if (s.home_goals === s.away_goals) {
      // Drawn matches in a knockout need extra-time/penalties — we can't auto-advance.
      return { ok: false, reason: 'tied_match_needs_decider' };
    }
    winners.push(s.home_goals > s.away_goals ? m.home_team_id : m.away_team_id);
  }

  // Round 0 → Round 1 transition includes bye teams.
  let advancing: string[];
  if (deepestRound === 0 && hasByes) {
    const byeTeams = seedOrder.filter(t => !playedTeams.has(t));
    // bye teams keep their seed order at the top; round-0 winners fill the bottom.
    advancing = [...byeTeams, ...winners];
  } else {
    advancing = winners;
  }

  if (advancing.length < 2) return { ok: false, reason: 'too_few_teams_to_advance' };

  // 6. Pair entrants in bracket order. We assume `advancing` is already in
  //    bracket order (top seeds at the start, last winner at the end), which
  //    matches how the original generator laid round 0 out.
  const nextPairs: Array<[string, string]> = [];
  for (let i = 0; i < advancing.length; i += 2) {
    if (advancing[i] && advancing[i + 1]) nextPairs.push([advancing[i], advancing[i + 1]]);
  }
  if (nextPairs.length === 0) return { ok: false, reason: 'no_pairs_for_next_round' };

  // 7. Schedule date: use the latest current-round scheduled_at + 7 days as a
  //    sensible default. (User can edit each match's date afterwards.)
  const latestDate = currentRoundMatches.reduce<Date>((acc, m) => {
    const d = new Date(m.scheduled_at ?? Date.now());
    return d > acc ? d : acc;
  }, new Date(0));
  const nextDate = new Date(latestDate.getTime() + 7 * 86400000);

  // 8. Insert.
  const { data: { user } } = await supabase.auth.getUser();
  const matchRows = nextPairs.map(([home, away]) => ({
    competition_id: competitionId,
    home_team_id: home,
    away_team_id: away,
    scheduled_at: nextDate.toISOString(),
    status: 'scheduled' as const,
    round_label: nextLabel,
    format: (comp as any).format ?? '11v11',
    period_length_min: 25,
    number_of_periods: 2,
    created_by: user?.id ?? null,
  }));
  const { error: insErr } = await supabase.from('matches').insert(matchRows);
  if (insErr) return { ok: false, reason: `insert_failed: ${insErr.message}` };

  revalidatePath(`/competitions/${competitionId}`);
  return { ok: true, created: matchRows.length, nextRoundLabel: nextLabel };
}
