import Link from 'next/link';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty';
import { he } from '@/lib/i18n/he';
import { contrastText } from '@/lib/utils';
import { NewPlayerForm } from './_new-player';

export const dynamic = 'force-dynamic';

export default async function PlayersPage({ searchParams }: { searchParams: { team?: string } }) {
  const supabase = getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Teams I manage (for the new-player form) + the catalogue of training groups.
  const [{ data: myTeams }, { data: trainingGroups }] = await Promise.all([
    supabase.from('teams').select('id, name, team_members!inner(role, user_id)').eq('team_members.user_id', user!.id).in('team_members.role', ['manager', 'assistant']),
    supabase.from('training_groups').select('id, name').order('name'),
  ]);

  // Fetch ALL active players. Team membership is now many-to-many
  // via team_rosters, so we never filter the players query by team_id
  // (which is nullable / stale post-refactor).
  const { data: players } = await supabase
    .from('players')
    .select('id, display_name, position, training_group:training_groups(id, name)')
    .eq('is_active', true)
    .order('display_name');

  // Fetch each player's roster memberships (squad number + team) so we can
  // show which teams they belong to next to their name.
  const playerIds = (players ?? []).map(p => p.id);
  const { data: rostersRaw } = playerIds.length > 0
    ? await supabase.from('team_rosters')
        .select('player_id, squad_number, team:teams(id, name, primary_color, short_name)')
        .in('player_id', playerIds)
    : { data: [] as any[] };
  const rostersByPlayer = new Map<string, any[]>();
  for (const r of (rostersRaw ?? []) as any[]) {
    const t = Array.isArray(r.team) ? r.team[0] : r.team;
    if (!t) continue;
    const arr = rostersByPlayer.get(r.player_id) ?? [];
    arr.push({ team: t, squad_number: r.squad_number });
    rostersByPlayer.set(r.player_id, arr);
  }

  // If a team filter is present in the URL, keep only players who
  // are rostered to that team (via team_rosters — not players.team_id).
  const filteredPlayers = searchParams.team
    ? (players ?? []).filter(p => (rostersByPlayer.get(p.id) ?? []).some((r: any) => r.team.id === searchParams.team))
    : (players ?? []);

  return (
    <div className="space-y-6">
      {(myTeams ?? []).length > 0 && (
        <NewPlayerForm
          teams={myTeams!.map(t => ({ id: t.id, name: t.name }))}
          trainingGroups={trainingGroups ?? []}
          defaultTeam={searchParams.team}
        />
      )}

      {filteredPlayers.length === 0 ? (
        <EmptyState title="אין שחקנים" description="הוסיפו שחקנים לקבוצה ניהולית כדי שיופיעו כאן." />
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-ink-100 dark:divide-ink-700">
            {filteredPlayers.map((p: any) => {
              const rosters = rostersByPlayer.get(p.id) ?? [];
              // Display the most recent roster's number + colour (first
              // roster row by default). Players with no team show '—'.
              const primary = rosters[0]?.team;
              const primaryNumber = rosters[0]?.squad_number;
              return (
                <li key={p.id} className="p-4 flex items-center gap-3 hover:bg-ink-50 dark:hover:bg-ink-800/50 transition-colors">
                  <span
                    className="size-9 rounded-full grid place-items-center font-display font-bold text-sm shrink-0"
                    style={{
                      background: primary?.primary_color ?? '#475569',
                      color: contrastText(primary?.primary_color ?? '#475569'),
                    }}
                  >
                    {primaryNumber ?? '—'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <Link href={`/players/${p.id}`} className="font-medium hover:underline text-ink-900 dark:text-ink-100 truncate block">{p.display_name}</Link>
                    <div className="text-xs text-ink-500 dark:text-ink-400 flex items-center gap-2 flex-wrap">
                      {rosters.length === 0 ? (
                        <span className="text-ink-400">ללא קבוצה</span>
                      ) : (
                        rosters.map((r: any) => (
                          <span key={r.team.id} className="inline-flex items-center gap-1">
                            <span className="size-2 rounded-full" style={{ background: r.team.primary_color ?? '#94a3b8' }} />
                            {r.team.name}
                          </span>
                        ))
                      )}
                      {(() => {
                        const tg = Array.isArray(p.training_group) ? p.training_group[0] : p.training_group;
                        return tg?.name ? (
                          <>
                            <span className="text-ink-300">·</span>
                            <span className="inline-flex items-center gap-1">📅 {tg.name}</span>
                          </>
                        ) : null;
                      })()}
                    </div>
                  </div>
                  <Badge tone="neutral">{he.player.positions[p.position]}</Badge>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
