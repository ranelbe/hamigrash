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

  let q = supabase
    .from('players')
    .select('id, display_name, squad_number, position, team_id, team:teams(name, primary_color, short_name), training_group:training_groups(id, name)')
    .eq('is_active', true)
    .order('display_name');
  if (searchParams.team) q = q.eq('team_id', searchParams.team);
  const { data: players } = await q;

  return (
    <div className="space-y-6">
      {(myTeams ?? []).length > 0 && (
        <NewPlayerForm
          teams={myTeams!.map(t => ({ id: t.id, name: t.name }))}
          trainingGroups={trainingGroups ?? []}
          defaultTeam={searchParams.team}
        />
      )}

      {(players ?? []).length === 0 ? (
        <EmptyState title="אין שחקנים" description="הוסיפו שחקנים לקבוצה ניהולית כדי שיופיעו כאן." />
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-ink-100 dark:divide-ink-700">
            {players!.map((p: any) => (
              <li key={p.id} className="p-4 flex items-center gap-3 hover:bg-ink-50 dark:hover:bg-ink-800/50 transition-colors">
                <span className="size-9 rounded-full grid place-items-center font-display font-bold text-sm shrink-0" style={{ background: p.team?.primary_color ?? '#475569', color: contrastText(p.team?.primary_color ?? '#475569') }}>
                  {p.squad_number ?? '—'}
                </span>
                <div className="flex-1 min-w-0">
                  <Link href={`/players/${p.id}`} className="font-medium hover:underline text-ink-900 dark:text-ink-100 truncate block">{p.display_name}</Link>
                  <div className="text-xs text-ink-500 dark:text-ink-400 flex items-center gap-2 truncate">
                    <span>{p.team?.name}</span>
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
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
