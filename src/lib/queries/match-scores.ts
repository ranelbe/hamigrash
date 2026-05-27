import { getSupabaseServerClient } from '@/lib/supabase/server';

// Helper: enrich a list of matches with score from match_scores view.
// Done as a separate query to avoid PostgREST embed quirks on views.
export async function attachScores<T extends { id: string }>(matches: T[]): Promise<(T & { score: { home_goals: number; away_goals: number } })[]> {
  if (matches.length === 0) return [];
  const supabase = getSupabaseServerClient();
  const ids = matches.map(m => m.id);
  const { data: scores } = await supabase
    .from('match_scores')
    .select('match_id, home_goals, away_goals')
    .in('match_id', ids);
  const map = new Map<string, { home_goals: number; away_goals: number }>();
  for (const s of (scores ?? []) as any[]) {
    map.set(s.match_id, { home_goals: s.home_goals, away_goals: s.away_goals });
  }
  return matches.map(m => ({ ...m, score: map.get(m.id) ?? { home_goals: 0, away_goals: 0 } }));
}
