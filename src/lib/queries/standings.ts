import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { StandingWithForm } from '@/components/standings/standings-table';

// Fetch standings + recent form per team for one competition.
// Form is computed from the last 5 finished matches involving each team.
export async function loadStandingsWithForm(competitionId: string): Promise<StandingWithForm[]> {
  const supabase = getSupabaseServerClient();

  const [{ data: standings }, { data: matches }, { data: teams }] = await Promise.all([
    supabase.rpc('competition_standings', { p_competition_id: competitionId }),
    supabase.from('matches')
      .select('id, home_team_id, away_team_id, finished_at')
      .eq('competition_id', competitionId)
      .eq('status', 'finished')
      .order('finished_at', { ascending: true }),
    supabase.from('competition_teams')
      .select('team:teams(id, primary_color, short_name)')
      .eq('competition_id', competitionId),
  ]);

  // Fetch match scores separately to dodge PostgREST view-embed quirks.
  const matchIds = (matches ?? []).map(m => m.id);
  const { data: scores } = matchIds.length > 0
    ? await supabase.from('match_scores').select('match_id, home_goals, away_goals').in('match_id', matchIds)
    : { data: [] as any[] };
  const scoreMap = new Map<string, { home_goals: number; away_goals: number }>();
  for (const s of (scores ?? []) as any[]) scoreMap.set(s.match_id, { home_goals: s.home_goals, away_goals: s.away_goals });

  const teamMeta = new Map<string, { primary_color: string | null; short_name: string | null }>();
  for (const r of teams ?? []) {
    const t = (r as any).team;
    if (t) teamMeta.set(t.id, { primary_color: t.primary_color, short_name: t.short_name });
  }

  // Build form histories per team
  const form = new Map<string, ('W' | 'D' | 'L')[]>();
  for (const m of (matches ?? []) as any[]) {
    const s = scoreMap.get(m.id);
    const hg = s?.home_goals ?? 0;
    const ag = s?.away_goals ?? 0;
    const home = m.home_team_id, away = m.away_team_id;
    push(form, home, hg > ag ? 'W' : hg < ag ? 'L' : 'D');
    push(form, away, ag > hg ? 'W' : ag < hg ? 'L' : 'D');
  }

  return (standings ?? []).map((r: any) => ({
    ...r,
    form: form.get(r.team_id) ?? [],
    team_primary_color: teamMeta.get(r.team_id)?.primary_color ?? null,
    team_short_name: teamMeta.get(r.team_id)?.short_name ?? null,
  }));
}

function push(map: Map<string, ('W' | 'D' | 'L')[]>, key: string, v: 'W' | 'D' | 'L') {
  const arr = map.get(key) ?? [];
  arr.push(v);
  map.set(key, arr);
}
