'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseServerClient, requireCurrentUser } from '@/lib/supabase/server';
import { getIsAppAdmin } from '@/lib/auth/app-admin';
import { competitionCreateSchema, type CompetitionCreateInput } from '@/lib/schemas';
import { generateRoundRobin } from '@/lib/algorithms/fixtures';
import { generateKnockout } from '@/lib/algorithms/knockout';

// Translate the most common Postgres error messages to Hebrew so the
// user sees actionable feedback instead of raw SQL constraint names.
function humaniseDbError(err: { code?: string; message: string }): Error {
  if (err.code === '23505') {
    if (err.message.includes('slug')) {
      return new Error('כתובת ייחודית זו כבר תפוסה — בחר אחת אחרת');
    }
    return new Error('הערך הזה כבר קיים במערכת — נסה ערך אחר');
  }
  return new Error(err.message);
}

export async function createCompetition(input: CompetitionCreateInput) {
  const user = await requireCurrentUser();
  if (!(await getIsAppAdmin())) throw new Error('not_authorized: app_admin required');
  const parsed = competitionCreateSchema.parse(input);
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('competitions')
    .insert({ ...parsed, status: 'active', created_by: user.id }) // skip 'draft' state for amateur leagues
    .select('*')
    .single();
  if (error) throw humaniseDbError(error);
  revalidatePath('/competitions');
  return data;
}

export async function updateCompetition(competitionId: string, input: Partial<CompetitionCreateInput>) {
  await requireCurrentUser();
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from('competitions').update(input).eq('id', competitionId);
  if (error) throw humaniseDbError(error);
  revalidatePath(`/competitions/${competitionId}`);
  revalidatePath('/competitions');
}

export async function deleteCompetition(competitionId: string) {
  await requireCurrentUser();
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from('competitions').delete().eq('id', competitionId);
  if (error) throw new Error(error.message);
  revalidatePath('/competitions');
}

export async function addTeamToCompetition(competitionId: string, teamId: string, group?: string, seed?: number) {
  await requireCurrentUser();
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from('competition_teams')
    .insert({ competition_id: competitionId, team_id: teamId, group_label: group ?? null, seed: seed ?? null });
  if (error) throw new Error(error.message);
  revalidatePath(`/competitions/${competitionId}`);
}

export async function removeTeamFromCompetition(competitionId: string, teamId: string) {
  await requireCurrentUser();
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from('competition_teams')
    .delete()
    .eq('competition_id', competitionId)
    .eq('team_id', teamId);
  if (error) throw new Error(error.message);
  revalidatePath(`/competitions/${competitionId}`);
}

// Generate the full fixture list and insert matches in bulk.
export async function generateFixtures(competitionId: string, opts?: { startDate?: string; daysBetweenRounds?: number }) {
  await requireCurrentUser();
  const supabase = getSupabaseServerClient();

  const { data: comp, error: ce } = await supabase
    .from('competitions').select('*').eq('id', competitionId).single();
  if (ce || !comp) throw new Error(ce?.message ?? 'competition_not_found');

  const { data: enrolled, error: te } = await supabase
    .from('competition_teams').select('team_id, seed, group_label').eq('competition_id', competitionId);
  if (te) throw new Error(te.message);
  if (!enrolled || enrolled.length < 2) throw new Error('need_at_least_two_teams');

  const teamIds = enrolled.map(t => t.team_id);
  // Combine matchday date with default_match_time (e.g. '18:00') for a real timestamp.
  const baseDate = opts?.startDate ? opts.startDate : (comp.starts_on ?? new Date().toISOString().slice(0, 10));
  const matchTime = (comp.default_match_time ?? '18:00');
  const start = new Date(`${baseDate}T${matchTime}:00`);
  const gap = (opts?.daysBetweenRounds ?? comp.days_between_rounds ?? 7) * 24 * 60 * 60 * 1000;

  let rows: { competition_id: string; home_team_id: string; away_team_id: string; scheduled_at: string; round_label: string; bracket_round?: number | null; bracket_slot?: number | null; format: typeof comp.format }[] = [];

  if (comp.type === 'league') {
    const rounds = generateRoundRobin(teamIds, comp.rounds);
    rows = rounds.flatMap((round, idx) =>
      round.map(([home, away]) => ({
        competition_id: competitionId,
        home_team_id: home,
        away_team_id: away,
        scheduled_at: new Date(start.getTime() + idx * gap).toISOString(),
        round_label: `מחזור ${idx + 1}`,
        format: comp.format,
      })),
    );
  } else if (comp.type === 'cup') {
    const seeded = enrolled
      .slice()
      .sort((a, b) => (a.seed ?? 999) - (b.seed ?? 999))
      .map(t => t.team_id);
    const bracket = generateKnockout(seeded);
    rows = bracket.map(b => ({
      competition_id: competitionId,
      home_team_id: b.home,
      away_team_id: b.away,
      scheduled_at: new Date(start.getTime() + (b.round) * gap).toISOString(),
      round_label: cupRoundLabel(b.round, bracket.filter(x => x.round === 0).length),
      bracket_round: b.round,
      bracket_slot: b.slot,
      format: comp.format,
    }));
  } else {
    throw new Error('cannot_auto_generate_for_friendly');
  }

  const { error: ie } = await supabase.from('matches').insert(rows);
  if (ie) throw new Error(ie.message);
  revalidatePath(`/competitions/${competitionId}`);
  return rows.length;
}

function cupRoundLabel(round: number, finalRoundIndex: number) {
  const remaining = finalRoundIndex - round;
  if (remaining === 0) return 'גמר';
  if (remaining === 1) return 'חצי גמר';
  if (remaining === 2) return 'רבע גמר';
  if (remaining === 3) return 'שמינית גמר';
  return `סיבוב ${round + 1}`;
}
