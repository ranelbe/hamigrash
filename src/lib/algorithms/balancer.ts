// Team balancer — three objectives in strict priority order:
//
//   1. POSITION COVERAGE  (hard)   — every team should have GK/DF/MF/FW.
//   2. SKILL BALANCE      (hard)   — total OVR per team must be ≈ equal.
//   3. TRAINING-GROUP COHESION (soft) — when 1+2 are satisfied, prefer to
//      keep training-group members on the same team.
//
// Algorithm:
//
// Phase A — Position-first snake draft
//   For each position (scarcest first: GK → DF → FW → MF), sort by OVR
//   descending and snake-deal players across the teams. This guarantees
//   position coverage and a strong baseline for skill balance, regardless
//   of training-group memberships.
//
// Phase B — Skill-balance hill-climb (cohesion as TIEBREAKER)
//   While the strongest and weakest teams differ by more than 1 OVR point,
//   find the same-position swap that closes the gap the most. Ties are
//   broken by training-group cohesion (prefer the swap that reduces the
//   number of "splits"). Capped at 200 iterations.
//
// Phase C — Pure cohesion polish (skill-neutral)
//   After skill balance is settled, do a final pass of same-position swaps
//   that reduce splits WITHOUT growing the skill gap by more than 1 OVR.
//   Capped at 50 iterations.
//
// Net effect: skill + position are non-negotiable; cohesion is improved
// to the extent it doesn't compromise the two primaries.

export interface BalancerPlayer {
  id: string;
  display_name: string;
  position: 'GK' | 'DF' | 'MF' | 'FW';
  training_group_id?: string | null;
  training_group?: { id: string; name: string } | null;
  rating_pace: number | null;
  rating_shooting: number | null;
  rating_passing: number | null;
  rating_dribbling: number | null;
  rating_defending: number | null;
  rating_physical: number | null;
  rating_gk_diving: number | null;
  rating_gk_handling: number | null;
  rating_gk_kicking: number | null;
  rating_gk_reflexes: number | null;
  rating_gk_speed: number | null;
  rating_gk_positioning: number | null;
}

export function computeOvr(p: BalancerPlayer): number {
  const xs = p.position === 'GK'
    ? [p.rating_gk_diving, p.rating_gk_handling, p.rating_gk_kicking, p.rating_gk_reflexes, p.rating_gk_speed, p.rating_gk_positioning]
    : [p.rating_pace, p.rating_shooting, p.rating_passing, p.rating_dribbling, p.rating_defending, p.rating_physical];
  const present = xs.filter((x): x is number => x != null);
  if (!present.length) return 50;
  return Math.round(present.reduce((a, b) => a + b, 0) / present.length);
}

function teamStrength(team: BalancerPlayer[]): number {
  return team.reduce((s, p) => s + computeOvr(p), 0);
}

// Count "splits" — for each training_group, how many extra teams it spreads across.
// A group entirely on one team contributes 0; spread over 3 teams contributes 2.
function countSplits(teams: BalancerPlayer[][]): number {
  const groupTeams = new Map<string, Set<number>>();
  teams.forEach((team, ti) => {
    for (const p of team) {
      if (!p.training_group_id) continue;
      const s = groupTeams.get(p.training_group_id) ?? new Set<number>();
      s.add(ti);
      groupTeams.set(p.training_group_id, s);
    }
  });
  let splits = 0;
  for (const set of groupTeams.values()) splits += Math.max(0, set.size - 1);
  return splits;
}

function gap(teams: BalancerPlayer[][]): number {
  const s = teams.map(teamStrength);
  return Math.max(...s) - Math.min(...s);
}

export function balanceTeams(players: BalancerPlayer[], teamCount: number): { teams: BalancerPlayer[][]; strengths: number[] } {
  if (teamCount < 2) throw new Error('teamCount must be >= 2');
  if (players.length < teamCount) throw new Error('not_enough_players');

  // ============================================================
  // Phase A — Position-first snake draft
  // ============================================================
  const teams: BalancerPlayer[][] = Array.from({ length: teamCount }, () => []);
  const byPos: Record<string, BalancerPlayer[]> = { GK: [], DF: [], MF: [], FW: [] };
  for (const p of players) byPos[p.position].push(p);
  for (const pos of ['GK', 'DF', 'MF', 'FW'] as const) {
    byPos[pos].sort((a, b) => computeOvr(b) - computeOvr(a));
  }

  // Scarce positions first so they spread across teams.
  let direction = 1;
  let teamIdx = 0;
  for (const pos of ['GK', 'DF', 'FW', 'MF'] as const) {
    for (const p of byPos[pos]) {
      teams[teamIdx].push(p);
      teamIdx += direction;
      if (teamIdx === teamCount) { teamIdx = teamCount - 1; direction = -1; }
      else if (teamIdx < 0)      { teamIdx = 0;             direction = 1;  }
    }
  }

  // ============================================================
  // Phase B — Skill-balance hill-climb (cohesion as tiebreaker)
  // ============================================================
  for (let iter = 0; iter < 200; iter++) {
    const strengths = teams.map(teamStrength);
    const max = Math.max(...strengths);
    const min = Math.min(...strengths);
    if (max - min <= 1) break;

    const hi = strengths.indexOf(max);
    const lo = strengths.indexOf(min);
    const splitsBefore = countSplits(teams);

    let best: { i: number; j: number; newGap: number; cohesionGain: number } | null = null;

    for (let i = 0; i < teams[hi].length; i++) {
      for (let j = 0; j < teams[lo].length; j++) {
        const a = teams[hi][i], b = teams[lo][j];
        if (a.position !== b.position) continue;
        const delta = computeOvr(a) - computeOvr(b);
        if (delta <= 0) continue;
        const newGap = Math.abs((max - delta) - (min + delta));
        if (newGap >= max - min) continue;

        // Probe cohesion change.
        teams[hi][i] = b; teams[lo][j] = a;
        const splitsAfter = countSplits(teams);
        teams[hi][i] = a; teams[lo][j] = b; // undo

        const cohesionGain = splitsBefore - splitsAfter;

        // Best = smallest newGap; ties broken by larger cohesionGain.
        if (
          !best
          || newGap < best.newGap
          || (newGap === best.newGap && cohesionGain > best.cohesionGain)
        ) {
          best = { i, j, newGap, cohesionGain };
        }
      }
    }
    if (!best) break;
    [teams[hi][best.i], teams[lo][best.j]] = [teams[lo][best.j], teams[hi][best.i]];
  }

  // ============================================================
  // Phase C — Pure cohesion polish (skill-neutral)
  // Only accept swaps that strictly improve cohesion AND don't grow
  // the strength gap by more than 1 OVR.
  // ============================================================
  for (let iter = 0; iter < 50; iter++) {
    const splits = countSplits(teams);
    if (splits === 0) break;
    const gBefore = gap(teams);

    let bestSwap: { ti: number; tj: number; pi: number; pj: number; gain: number } | null = null;

    for (let ti = 0; ti < teams.length; ti++) {
      for (let tj = ti + 1; tj < teams.length; tj++) {
        for (let pi = 0; pi < teams[ti].length; pi++) {
          for (let pj = 0; pj < teams[tj].length; pj++) {
            const a = teams[ti][pi], b = teams[tj][pj];
            if (a.position !== b.position) continue;
            // Probe
            teams[ti][pi] = b; teams[tj][pj] = a;
            const newSplits = countSplits(teams);
            const newGap = gap(teams);
            // Revert
            teams[ti][pi] = a; teams[tj][pj] = b;

            // Accept only if cohesion strictly improves AND skill barely changes.
            if (newSplits < splits && newGap <= gBefore + 1) {
              const gain = splits - newSplits;
              if (!bestSwap || gain > bestSwap.gain) {
                bestSwap = { ti, tj, pi, pj, gain };
              }
            }
          }
        }
      }
    }
    if (!bestSwap) break;
    const { ti, tj, pi, pj } = bestSwap;
    [teams[ti][pi], teams[tj][pj]] = [teams[tj][pj], teams[ti][pi]];
  }

  return { teams, strengths: teams.map(teamStrength) };
}
