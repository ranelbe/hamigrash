import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Pencil, CalendarDays, ShieldCheck, MapPin, Trophy } from 'lucide-react';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getIsAppAdmin } from '@/lib/auth/app-admin';
import { PlayerCard } from '@/components/player/player-card';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { DeleteButton } from '@/components/ui/delete-button';
import { deletePlayer } from '@/lib/actions/players';
import { he } from '@/lib/i18n/he';

export const dynamic = 'force-dynamic';

export default async function PlayerDetail({ params }: { params: { id: string } }) {
  const supabase = getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: player } = await supabase
    .from('players')
    .select('*, training_group:training_groups(id, name)')
    .eq('id', params.id)
    .single();
  if (!player) notFound();

  // All teams this player is currently rostered on (many-to-many).
  const { data: playerTeamsRaw } = await supabase
    .from('team_rosters')
    .select('squad_number, team:teams(id, name, slug, primary_color, short_name)')
    .eq('player_id', player.id);
  const playerTeams = (playerTeamsRaw ?? []).map((r: any) => {
    const t = Array.isArray(r.team) ? r.team[0] : r.team;
    return t ? { ...t, squad_number: r.squad_number } : null;
  }).filter(Boolean);

  const teamIds = playerTeams.map((t: any) => t.id);

  // Map each team → the competitions it's enrolled in, so we can group
  // the player's teams under the competitions they actually compete in
  // (a player in 'ליגת שלישי' shouldn't see 'גביע הסתיו' clumped in).
  const { data: compTeamsRaw } = teamIds.length > 0
    ? await supabase.from('competition_teams')
        .select('team_id, competition:competitions(id, name, type, status, season)')
        .in('team_id', teamIds)
    : { data: [] as any[] };
  // teamId → list of competitions this team participates in
  const compsByTeam = new Map<string, any[]>();
  for (const row of (compTeamsRaw ?? []) as any[]) {
    const comp = Array.isArray(row.competition) ? row.competition[0] : row.competition;
    if (!comp) continue;
    const arr = compsByTeam.get(row.team_id) ?? [];
    arr.push(comp);
    compsByTeam.set(row.team_id, arr);
  }
  // Now build the inverted view: competitionId → list of player's teams in it
  type GroupedComp = { competition: any | null; teams: any[] };
  const groups = new Map<string, GroupedComp>();
  const FRIENDLY_KEY = '__friendly__';
  for (const t of playerTeams as any[]) {
    const comps = compsByTeam.get(t.id) ?? [];
    if (comps.length === 0) {
      const g = groups.get(FRIENDLY_KEY) ?? { competition: null, teams: [] };
      g.teams.push(t);
      groups.set(FRIENDLY_KEY, g);
    } else {
      for (const c of comps) {
        const g = groups.get(c.id) ?? { competition: c, teams: [] };
        g.teams.push(t);
        groups.set(c.id, g);
      }
    }
  }
  // Sorted: real competitions first (newest by season desc), friendlies last
  const competitionGroups = Array.from(groups.values()).sort((a, b) => {
    if (!a.competition) return 1;
    if (!b.competition) return -1;
    return (b.competition.season ?? '').localeCompare(a.competition.season ?? '');
  });

  const [isAdmin, { data: managedRows }] = await Promise.all([
    getIsAppAdmin(),
    user && teamIds.length > 0
      ? supabase.from('team_members').select('role, team_id').eq('user_id', user.id).in('team_id', teamIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);
  const canEdit = isAdmin || (managedRows ?? []).some((r: any) =>
    ['manager', 'assistant'].includes(r?.role ?? ''),
  );

  const { data: stats } = await supabase.rpc('player_stats', { p_player_id: params.id });
  const s = (stats?.[0] ?? {}) as Record<string, number>;

  return (
    <div className="grid lg:grid-cols-[360px_1fr] gap-6">
      <div className="space-y-3">
        {/* Ratings panel — visible only to admins / team managers */}
        {canEdit && <PlayerCard player={player as any} />}

        {/* Metadata strip — teams grouped by competition + training group */}
        <Card>
          <CardBody className="space-y-3">
            {competitionGroups.length > 0 && (
              <div className="space-y-2">
                {competitionGroups.map((g: any, idx: number) => (
                  <div key={g.competition?.id ?? `friendly-${idx}`} className="text-sm">
                    <div className="flex items-center gap-2 text-ink-500 dark:text-ink-400 mb-1">
                      {g.competition ? <Trophy className="size-4" /> : <ShieldCheck className="size-4" />}
                      <span>
                        {g.competition
                          ? <Link href={`/competitions/${g.competition.id}`} className="hover:underline font-medium text-ink-700 dark:text-ink-300">
                              {g.competition.name}
                            </Link>
                          : 'ידידותיים / ללא תחרות'}
                      </span>
                    </div>
                    <div className="ms-6 flex flex-wrap gap-1.5">
                      {g.teams.map((t: any) => (
                        <Link
                          key={t.id}
                          href={`/teams/${t.id}`}
                          className="font-medium text-ink-900 dark:text-ink-100 hover:underline"
                          style={{ borderInlineStart: `3px solid ${t.primary_color ?? '#94a3b8'}`, paddingInlineStart: '0.5rem' }}
                        >
                          {t.name}{t.squad_number ? ` (#${t.squad_number})` : ''}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <CalendarDays className="size-4 text-ink-500" />
              <span className="text-ink-500">קבוצת אימון:</span>
              <span className="font-medium text-ink-900">{(() => {
                const tg: any = (player as any).training_group;
                const obj = Array.isArray(tg) ? tg[0] : tg;
                return obj?.name ?? '—';
              })()}</span>
            </div>
            {((player as any).address_city || (player as any).address_street) && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="size-4 text-ink-500" />
                <span className="text-ink-500">כתובת:</span>
                <span className="font-medium text-ink-900">
                  {[(player as any).address_street, (player as any).address_city].filter(Boolean).join(', ')}
                </span>
              </div>
            )}
          </CardBody>
        </Card>

        {canEdit && (
          <div className="flex gap-2">
            <Link href={`/players/${player.id}/edit`} className="flex-1 rounded-xl bg-white dark:bg-ink-800 ring-1 ring-ink-200 dark:ring-ink-700 h-10 inline-flex items-center justify-center gap-2 font-medium hover:bg-ink-50 dark:hover:bg-ink-700 text-ink-900 dark:text-ink-100">
              <Pencil className="size-4" />{he.common.edit}
            </Link>
            <DeleteButton
              action={async () => { 'use server'; await deletePlayer(player.id, playerTeams[0]?.id ?? null); }}
              redirectTo={playerTeams[0]?.id ? `/teams/${playerTeams[0].id}` : '/players'}
              confirm={`מחיקת השחקן "${player.display_name}"?`}
            />
          </div>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle>סטטיסטיקה</CardTitle></CardHeader>
        <CardBody>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-center">
            <Stat label={he.player.appearances} value={s.appearances ?? 0} />
            <Stat label={he.player.goals}        value={s.goals ?? 0} />
            <Stat label={he.player.assists}      value={s.assists ?? 0} />
            <Stat label={he.player.yellowCards}  value={s.yellow_cards ?? 0} />
            <Stat label={he.player.redCards}     value={s.red_cards ?? 0} />
            <Stat label={he.player.minutes}      value={s.minutes ?? 0} />
          </div>
          {player.position === 'GK' && (
            <div className="grid grid-cols-3 gap-3 text-center mt-3">
              <Stat label={he.player.saves}        value={s.saves ?? 0} />
              <Stat label="פנדלים שהובקעו"        value={s.penalties_scored ?? 0} />
              <Stat label="פנדלים שהוחמצו"        value={s.penalties_missed ?? 0} />
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-ink-50 p-3">
      <div className="font-display text-2xl font-bold tabular">{value}</div>
      <div className="text-xs text-ink-500 dark:text-ink-400 mt-1">{label}</div>
    </div>
  );
}
