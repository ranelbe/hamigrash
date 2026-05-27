'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseServerClient, requireCurrentUser } from '@/lib/supabase/server';
import { getIsAppAdmin } from '@/lib/auth/app-admin';
import { slugify } from '@/lib/utils';
import { generateRoundRobin } from '@/lib/algorithms/fixtures';
import { generateKnockout } from '@/lib/algorithms/knockout';

type Side = { name: string; player_ids: string[] };

type CompetitionConfig = {
  name: string;
  type?: 'league' | 'cup';    // default 'league'
  format?: '5v5' | '6v6' | '7v7' | '8v8' | '9v9' | '10v10' | '11v11';
  generateFixtures?: boolean;
  startsOn?: string;          // YYYY-MM-DD
  daysBetweenRounds?: number; // default 7 (cup: gap between rounds 0/1)
  rounds?: 1 | 2 | 3 | 4;     // round-robin legs (default 1) — cup ignores this
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

  // Build unique slugs so balancer runs never collide. The team NAME is a
  // display field and can repeat freely ('קבוצה א' is fine across leagues),
  // but `slug` is the unique URL identifier — we always append a
  // base-36 timestamp + position index to guarantee uniqueness.
  const ts = Date.now().toString(36);
  const teamRows = sides.map((s, i) => {
    const colors = TEAM_COLORS[i % TEAM_COLORS.length];
    const slugBase = slugify(s.name).slice(0, 35) || 'team';
    return {
      name: s.name || `קבוצה ${String.fromCharCode(1488 + i)}`,
      slug: `${slugBase}-${ts}${i}`.slice(0, 50),
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

  // Add players to the new teams via team_rosters. Players keep any
  // existing team memberships — the balancer no longer "moves" them
  // (a player can be on multiple teams at once). Squad numbers are
  // unique per (team, squad_number), so sequential 1..N within each
  // new team is always safe.
  for (let i = 0; i < sides.length; i++) {
    const teamId = createdTeams[i].id;
    const ids = sides[i].player_ids;
    if (!ids.length) continue;
    const rosterRows = ids.map((pid, j) => ({
      team_id: teamId,
      player_id: pid,
      squad_number: j + 1,
    }));
    const { error: rErr } = await supabase.from('team_rosters').insert(rosterRows);
    if (rErr) throw new Error(`roster_insert_failed: ${rErr.message}`);
  }

  // Optional: create a competition + enroll all teams + (optionally) generate fixtures.
  let competitionId: string | null = null;
  if (opts.competition) {
    // Same story for the competition slug — must be globally unique even if
    // the name repeats ('ליגה דצמבר 2026' shouldn't blow up the second time).
    const compTs = Date.now().toString(36);
    const compSlugBase = slugify(opts.competition.name).slice(0, 40) || 'comp';
    const compSlug = `${compSlugBase}-${compTs}`.slice(0, 50);
    const compType = opts.competition.type ?? 'league';

    const startDate = opts.competition.startsOn ? new Date(opts.competition.startsOn) : new Date();
    const daysBetween = Math.max(1, opts.competition.daysBetweenRounds ?? 7);
    const teamIds = createdTeams.map(t => t.id);
    const ymd = (d: Date) => d.toISOString().slice(0, 10);
    const dayMs = daysBetween * 86400000;

    // Branch fixture strategy on competition type.
    // - league: full round-robin (N teams × R legs)
    // - cup:    single-elimination; only round-0 is pre-created here.
    //           Subsequent rounds are added as winners are determined.
    let matchRows: any[] = [];
    let endDate = startDate;
    let leagueRoundCount = 1; // only relevant for league

    if (compType === 'cup') {
      const bracket = generateKnockout(teamIds);
      const totalCupRounds = Math.ceil(Math.log2(teamIds.length));
      // hasByes = first-round count is below half the team count → some
      // teams advance with a bye. Affects label naming for round 0.
      const hasByes = bracket.length < Math.floor(teamIds.length / 2);
      endDate = totalCupRounds > 0
        ? new Date(startDate.getTime() + (totalCupRounds - 1) * dayMs)
        : startDate;
      matchRows = bracket.map(m => ({
        competition_id: undefined as any, // filled below after comp insert
        home_team_id: m.home,
        away_team_id: m.away,
        scheduled_at: new Date(startDate.getTime() + m.round * dayMs).toISOString(),
        status: 'scheduled' as const,
        round_label: cupRoundLabel(m.round, totalCupRounds, hasByes),
        format: opts.competition.format ?? '11v11',
        period_length_min: 25,
        number_of_periods: 2,
        created_by: user.id,
      }));
    } else {
      leagueRoundCount = (opts.competition.rounds ?? 1);
      const rrRounds = generateRoundRobin(teamIds, leagueRoundCount);
      endDate = rrRounds.length > 0
        ? new Date(startDate.getTime() + (rrRounds.length - 1) * dayMs)
        : startDate;
      matchRows = rrRounds.flatMap((round, idx) => round.map(([home, away]) => ({
        competition_id: undefined as any,
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
    }

    const { data: comp, error: cErr } = await supabase
      .from('competitions')
      .insert({
        name: opts.competition.name,
        slug: compSlug,
        type: compType,
        status: 'active',
        format: opts.competition.format ?? '11v11',
        season: new Date().getFullYear().toString(),
        starts_on: ymd(startDate),
        ends_on: ymd(endDate),
        rounds: compType === 'cup' ? 1 : leagueRoundCount,
        created_by: user.id,
      })
      .select('id').single();
    if (cErr) throw new Error(`comp_create_failed: ${cErr.message}`);
    competitionId = comp.id;

    // Enroll all created teams in the new competition.
    const enrolRows = createdTeams.map(t => ({ competition_id: comp.id, team_id: t.id }));
    const { error: eErr } = await supabase.from('competition_teams').insert(enrolRows);
    if (eErr) throw new Error(`enrol_failed: ${eErr.message}`);

    if (opts.competition.generateFixtures && matchRows.length > 0) {
      // Fill in the comp id now that we have it.
      for (const r of matchRows) r.competition_id = comp.id;
      const { error: fxErr } = await supabase.from('matches').insert(matchRows);
      if (fxErr) throw new Error(`fixtures_failed: ${fxErr.message}`);
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

// Cup round labels — Hebrew names by distance from the final.
// totalRounds=3 ⇒ rounds [0,1,2] = [רבע גמר, חצי גמר, גמר].
// When the bracket isn't a power of 2 (e.g. 10 teams) round 0 is a
// "preliminary round" with fewer matches; we call it סיבוב מקדים instead
// of the misleading שמינית גמר / שישית עשרה גמר.
function cupRoundLabel(round: number, totalRounds: number, hasByes = false): string {
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
