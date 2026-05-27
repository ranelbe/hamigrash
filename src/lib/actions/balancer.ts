'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseServerClient, requireCurrentUser } from '@/lib/supabase/server';
import { getIsAppAdmin } from '@/lib/auth/app-admin';
import { slugify } from '@/lib/utils';
import { generateRoundRobin } from '@/lib/algorithms/fixtures';

type Side = { name: string; player_ids: string[] };

type CompetitionConfig = {
  name: string;
  format?: '5v5' | '6v6' | '7v7' | '8v8' | '9v9' | '10v10' | '11v11';
  generateFixtures?: boolean;
  startsOn?: string;          // YYYY-MM-DD
  daysBetweenRounds?: number; // default 7
  rounds?: 1 | 2 | 3 | 4;     // round-robin legs (default 1)
};

const TEAM_COLORS = [
  { primary: '#16a34a', secondary: '#0f172a' }, // green
  { primary: '#dc2626', secondary: '#0f172a' }, // red
  { primary: '#1d4ed8', secondary: '#ffffff' }, // blue
  { primary: '#fbbf24', secondary: '#0a0a0a' }, // amber
  { primary: '#9333ea', secondary: '#ffffff' }, // purple
  { primary: '#0e7490', secondary: '#ffffff' }, // teal
];

// Create one team per balanced side. Optionally also create a friendly
// match between the first two sides with lineup rows for each player.
//
// Returns the created teams (and optionally the match id) so the UI
// can route the user somewhere useful.
export async function createTeamsFromBalancer(
  sides: Side[],
  opts: {
    createMatch?: boolean;
    venue?: string;
    scheduledAt?: string | null;
    competition?: CompetitionConfig | null;
  } = {},
) {
  const user = await requireCurrentUser();
  if (!(await getIsAppAdmin())) throw new Error('not_authorized: app_admin required');
  if (sides.length < 2) throw new Error('need_at_least_two_sides');

  const supabase = getSupabaseServerClient();

  // Build unique slug bases so concurrent runs do not collide.
  const ts = Date.now().toString(36);
  const teamRows = sides.map((s, i) => {
    const colors = TEAM_COLORS[i % TEAM_COLORS.length];
    return {
      name: s.name || `קבוצה ${String.fromCharCode(1488 + i)}`,
      slug: (slugify(s.name) || `team-${ts}-${i}`).slice(0, 50),
      short_name: (s.name || `ק${i + 1}`).slice(0, 3),
      primary_color: colors.primary,
      secondary_color: colors.secondary,
      crest_shape: 'hexagon',
      created_by: user.id,
    };
  });

  const { data: createdTeams, error: teamsErr } = await supabase
    .from('teams').insert(teamRows).select('id, name');
  if (teamsErr) throw new Error(teamsErr.message);
  if (!createdTeams || createdTeams.length !== sides.length) throw new Error('team_creation_failed');

  // MOVE players: update team_id (identity preserved → stat history intact).
  // We null squad_numbers first so the (team_id, squad_number) unique constraint
  // can't trip while we reassign sequentially.
  for (let i = 0; i < sides.length; i++) {
    const teamId = createdTeams[i].id;
    const ids = sides[i].player_ids;
    if (!ids.length) continue;
    const { error: upErr } = await supabase
      .from('players')
      .update({ team_id: teamId, squad_number: null })
      .in('id', ids);
    if (upErr) throw new Error(upErr.message);
    for (let j = 0; j < ids.length; j++) {
      await supabase.from('players').update({ squad_number: j + 1 }).eq('id', ids[j]);
    }
  }

  // Optional: create a competition + enroll all teams + (optionally) generate fixtures.
  let competitionId: string | null = null;
  if (opts.competition) {
    const ts = Date.now().toString(36);
    const compSlug = (slugify(opts.competition.name) || `comp-${ts}`).slice(0, 50);

    // Date math: fixture start → end is computed from the matchday count.
    const startDate = opts.competition.startsOn ? new Date(opts.competition.startsOn) : new Date();
    const daysBetween = Math.max(1, opts.competition.daysBetweenRounds ?? 7);
    const compRoundCount = (opts.competition.rounds ?? 1);
    const teamIds = createdTeams.map(t => t.id);
    const rounds = generateRoundRobin(teamIds, compRoundCount);
    // ends_on = start + (matchdays - 1) * daysBetween (last matchday date).
    const endDate = rounds.length > 0
      ? new Date(startDate.getTime() + (rounds.length - 1) * daysBetween * 86400000)
      : startDate;

    const ymd = (d: Date) => d.toISOString().slice(0, 10);

    const { data: comp, error: cErr } = await supabase
      .from('competitions')
      .insert({
        name: opts.competition.name,
        slug: compSlug,
        type: 'league',
        status: 'active',
        format: opts.competition.format ?? '11v11',
        season: new Date().getFullYear().toString(),
        starts_on: ymd(startDate),
        ends_on: ymd(endDate),
        rounds: compRoundCount,
        created_by: user.id,
      })
      .select('id').single();
    if (cErr) throw new Error(`comp_create_failed: ${cErr.message}`);
    competitionId = comp.id;

    // Enroll all created teams in the new competition.
    const enrolRows = createdTeams.map(t => ({ competition_id: comp.id, team_id: t.id }));
    const { error: eErr } = await supabase.from('competition_teams').insert(enrolRows);
    if (eErr) throw new Error(`enrol_failed: ${eErr.message}`);

    if (opts.competition.generateFixtures) {
      const dayMs = daysBetween * 86400000;
      const matchRows = rounds.flatMap((round, idx) => round.map(([home, away]) => ({
        competition_id: comp.id,
        home_team_id: home,
        away_team_id: away,
        scheduled_at: new Date(startDate.getTime() + idx * dayMs).toISOString(),
        status: 'scheduled' as const,
        round_label: `מחזור ${idx + 1}`,
        format: opts.competition!.format ?? '11v11',
        period_length_min: 25,
        number_of_periods: 2,
        created_by: user.id,
      })));
      if (matchRows.length > 0) {
        const { error: fxErr } = await supabase.from('matches').insert(matchRows);
        if (fxErr) throw new Error(`fixtures_failed: ${fxErr.message}`);
      }
    }
    revalidatePath(`/competitions/${comp.id}`);
    revalidatePath('/competitions');
  }

  let matchId: string | null = null;
  if (opts.createMatch && !opts.competition && createdTeams.length >= 2) {
    const { data: match, error: mErr } = await supabase
      .from('matches')
      .insert({
        home_team_id: createdTeams[0].id,
        away_team_id: createdTeams[1].id,
        status: 'scheduled',
        scheduled_at: opts.scheduledAt ?? new Date().toISOString(),
        venue: opts.venue ?? null,
        format: '7v7',
        period_length_min: 25,
        number_of_periods: 2,
        round_label: 'משחק ידידות',
        created_by: user.id,
      })
      .select('id').single();
    if (mErr) throw new Error(mErr.message);
    matchId = match.id;
  }

  revalidatePath('/teams');
  revalidatePath('/matches');
  return { teams: createdTeams, matchId, competitionId };
}
