// Round-robin fixture generation (Berger / circle method).
// Returns an array of rounds; each round is an array of [home, away] pairs.
//
// Properties:
//   - Every pair plays exactly `rounds` times.
//   - For odd team counts, one team gets a bye each round (we drop the BYE pair).
//   - For `rounds === 2`, the home/away of each pair is reversed in the second half (return leg).

type TeamId = string;
const BYE = '__BYE__';

export function generateRoundRobin(teamIds: TeamId[], rounds: number = 1): Array<Array<[TeamId, TeamId]>> {
  const teams = teamIds.slice();
  if (teams.length < 2) return [];
  if (teams.length % 2 === 1) teams.push(BYE);

  const n = teams.length;
  const halfRounds = n - 1;
  const half = n / 2;
  const allRounds: Array<Array<[TeamId, TeamId]>> = [];

  // First leg using Berger circle: fix teams[0], rotate the rest.
  const fixed = teams[0];
  let rotating = teams.slice(1);

  for (let r = 0; r < halfRounds; r++) {
    const round: Array<[TeamId, TeamId]> = [];
    // Pair fixed with the last element of rotating; alternate home/away by round parity.
    const last = rotating[rotating.length - 1];
    if (fixed !== BYE && last !== BYE) {
      round.push(r % 2 === 0 ? [fixed, last] : [last, fixed]);
    }
    for (let i = 0; i < half - 1; i++) {
      const home = rotating[i];
      const away = rotating[rotating.length - 2 - i];
      if (home !== BYE && away !== BYE) {
        round.push(r % 2 === 0 ? [home, away] : [away, home]);
      }
    }
    allRounds.push(round);
    rotating = [rotating[rotating.length - 1], ...rotating.slice(0, -1)];
  }

  // Additional legs by reversing home/away.
  if (rounds > 1) {
    const base = allRounds.map(r => r.map(([h, a]) => [h, a] as [TeamId, TeamId]));
    for (let leg = 1; leg < rounds; leg++) {
      for (const round of base) {
        allRounds.push(round.map(([h, a]) => (leg % 2 === 1 ? [a, h] : [h, a]) as [TeamId, TeamId]));
      }
    }
  }

  return allRounds;
}
