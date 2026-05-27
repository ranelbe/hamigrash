import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Pencil, CalendarDays, ShieldCheck, MapPin } from 'lucide-react';
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
    .select('*, team:teams(id, name, slug, primary_color, short_name), training_group:training_groups(id, name)')
    .eq('id', params.id)
    .single();
  if (!player) notFound();

  const [isAdmin, { data: tm }] = await Promise.all([
    getIsAppAdmin(),
    user ? supabase.from('team_members').select('role').eq('team_id', player.team_id).eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const canEdit = isAdmin || ['manager', 'assistant'].includes((tm as any)?.role ?? '');

  const { data: stats } = await supabase.rpc('player_stats', { p_player_id: params.id });
  const s = (stats?.[0] ?? {}) as Record<string, number>;

  return (
    <div className="grid lg:grid-cols-[360px_1fr] gap-6">
      <div className="space-y-3">
        {/* Ratings panel — visible only to admins / team managers */}
        {canEdit && <PlayerCard player={player as any} />}

        {/* Metadata strip — team + training group */}
        <Card>
          <CardBody className="space-y-2">
            {player.team && (
              <Link href={`/teams/${player.team.id}`} className="flex items-center gap-2 text-sm hover:underline">
                <ShieldCheck className="size-4 text-ink-500" />
                <span className="text-ink-500">קבוצה:</span>
                <span className="font-medium text-ink-900">{(player.team as any).name}</span>
              </Link>
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
              action={async () => { 'use server'; await deletePlayer(player.id, player.team_id); }}
              redirectTo={`/teams/${player.team_id}`}
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
