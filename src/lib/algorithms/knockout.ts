// Single-elimination bracket generation.
// Given an ordered list of seeds (1..N), produces ALL future matches with
// placeholder slots. We pre-create only the first round here; subsequent
// round matches are added once previous winners are known. (The DB stores
// bracket_round / bracket_slot for navigation.)
//
// For N not a power of two, the top seeds get a bye in round 0 (no match
// generated for them) and they enter directly at round 1.

type TeamId = string;

export interface BracketMatch {
  round: number;     // 0 = first round, last round = final
  slot: number;      // 0-indexed position within the round
  home: TeamId;
  away: TeamId;
}

export function generateKnockout(seeds: TeamId[]): BracketMatch[] {
  const n = seeds.length;
  if (n < 2) return [];

  const bracketSize = nextPow2(n);
  const byes = bracketSize - n;

  // Standard tournament seeding into bracket positions.
  const positions = seedingOrder(bracketSize); // array of seed numbers 1..bracketSize
  const slots: (TeamId | null)[] = positions.map(seed => {
    if (seed > n) return null; // bye placeholder
    return seeds[seed - 1];
  });

  const matches: BracketMatch[] = [];
  // First round: only pair slots where neither is null.
  // We use bye-aware logic: a slot adjacent to a bye advances automatically and is paired in round 1.
  // For simplicity here we generate only Round 0 (pairs of two real teams) and emit later rounds when winners exist.
  const roundIndex = totalRounds(bracketSize) - 1; // index of the final
  void byes;

  for (let i = 0; i < bracketSize; i += 2) {
    const home = slots[i];
    const away = slots[i + 1];
    if (home && away) {
      matches.push({ round: 0, slot: i / 2, home, away });
    }
  }
  void roundIndex;
  return matches;
}

function nextPow2(n: number) {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}
function totalRounds(size: number) {
  // size is a power of two
  return Math.log2(size);
}

// Generates the canonical seeding order for a bracket of `size` slots,
// e.g. size 8 → [1, 8, 4, 5, 2, 7, 3, 6]. This guarantees top seeds meet last.
function seedingOrder(size: number): number[] {
  let order = [1, 2];
  while (order.length < size) {
    const next: number[] = [];
    const sum = order.length * 2 + 1;
    for (const s of order) { next.push(s); next.push(sum - s); }
    order = next;
  }
  return order;
}
