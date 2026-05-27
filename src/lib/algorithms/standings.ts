// Standings ordering with full tie-breakers.
//
// The base ranking is produced by the SQL `competition_standings` function.
// It orders rows by (points desc, goal_difference desc, goals_for desc, name asc).
//
// This module re-sorts a group of rows that remain tied AFTER those primary
// keys by adding head-to-head as the next tie-breaker, then returns the
// final ranking. It is pure and isomorphic — can run on server or client.
//
// Tie-breaker order (configurable in the future):
//   1) Points
//   2) Goal difference
//   3) Goals scored
//   4) Head-to-head (3pts for a win in matches between the tied teams)
//   5) Name (alphabetic, stable)
//
// `h2hResolver` must return >0 if A is ahead of B, <0 if B ahead, 0 if tied.
// In production this is implemented by the SQL function `head_to_head`.

import type { StandingRow } from '@/lib/supabase/database.types';

export async function applyTieBreakers(
  rows: StandingRow[],
  h2hResolver: (teamA: string, teamB: string) => Promise<number>,
): Promise<StandingRow[]> {
  // Group rows by (points, GD, GF) tuple — these are the rows that remain tied
  // after the SQL ORDER BY and need head-to-head applied.
  const groups: StandingRow[][] = [];
  let current: StandingRow[] = [];
  let prev: { p: number; gd: number; gf: number } | null = null;
  for (const r of rows) {
    const key = { p: r.points, gd: r.goal_difference, gf: r.goals_for };
    if (prev && prev.p === key.p && prev.gd === key.gd && prev.gf === key.gf) {
      current.push(r);
    } else {
      if (current.length) groups.push(current);
      current = [r];
      prev = key;
    }
  }
  if (current.length) groups.push(current);

  const ordered: StandingRow[] = [];
  for (const group of groups) {
    if (group.length === 1) { ordered.push(group[0]); continue; }

    // Build a mini-league of head-to-head scores within the tied group.
    const score = new Map<string, number>();
    for (const r of group) score.set(r.team_id, 0);
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const delta = await h2hResolver(group[i].team_id, group[j].team_id);
        score.set(group[i].team_id, (score.get(group[i].team_id) ?? 0) + delta);
        score.set(group[j].team_id, (score.get(group[j].team_id) ?? 0) - delta);
      }
    }
    group.sort((a, b) => (score.get(b.team_id)! - score.get(a.team_id)!) || a.team_name.localeCompare(b.team_name, 'he'));
    ordered.push(...group);
  }
  return ordered;
}
