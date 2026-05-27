import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getIsAppAdmin } from '@/lib/auth/app-admin';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty';
import { DeleteButton } from '@/components/ui/delete-button';
import { deleteTeam } from '@/lib/actions/teams';
import { he } from '@/lib/i18n/he';
import { contrastText } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function TeamDetailPage({ params }: { params: { id: string } }) {
  const supabase = getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: team } = await supabase.from('teams').select('*').eq('id', params.id).single();
  if (!team) notFound();

  // Is the current user able to manage this specific team?
  const [{ data: membership }, isAdmin] = await Promise.all([
    user ? supabase.from('team_members').select('role').eq('team_id', team.id).eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null }),
    getIsAppAdmin(),
  ]);
  const canManageThisTeam = isAdmin || ['manager', 'assistant'].includes((membership as any)?.role ?? '');

  // Read the squad from team_rosters (many-to-many). The roster row owns
  // the squad_number for THIS team, while the player row owns identity +
  // ratings. Players may also be members of other teams simultaneously.
  const { data: roster } = await supabase
    .from('team_rosters')
    .select('squad_number, player:players(id, display_name, position, photo_url, is_active, rating_pace, rating_shooting, rating_passing, rating_dribbling, rating_defending, rating_physical)')
    .eq('team_id', team.id)
    .order('squad_number', { ascending: true });
  const players = (roster ?? [])
    .map((r: any) => {
      const p = Array.isArray(r.player) ? r.player[0] : r.player;
      return p ? { ...p, squad_number: r.squad_number } : null;
    })
    .filter((p: any) => p && p.is_active !== false);

  const { data: members } = await supabase
    .from('team_members')
    .select('role, user_id, profile:profiles(full_name, email, avatar_url)')
    .eq('team_id', team.id);

  return (
    <div className="space-y-6">
      <Card className="p-5 flex items-center gap-4">
        <div className="size-16 rounded-xl grid place-items-center text-2xl font-display font-bold" style={{ background: team.primary_color, color: contrastText(team.primary_color) }}>
          {team.short_name ?? team.name.slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-xl font-bold text-ink-900 dark:text-ink-50">{team.name}</h1>
          <p className="text-sm text-ink-500 dark:text-ink-400">{team.home_venue}</p>
        </div>
        {canManageThisTeam && (
          <div className="flex items-center gap-2">
            <Link href={`/players?team=${team.id}`} className="hidden sm:inline-flex rounded-xl bg-pitch-600 text-white px-4 h-10 items-center font-medium">{he.player.create}</Link>
            <Link href={`/teams/${team.id}/edit`} className="size-10 rounded-xl bg-white dark:bg-ink-800 ring-1 ring-ink-200 dark:ring-ink-700 grid place-items-center hover:bg-ink-50 dark:hover:bg-ink-700 text-ink-700 dark:text-ink-200" aria-label={he.common.edit}>
              <Pencil className="size-4" />
            </Link>
            <DeleteButton
              size="md"
              action={async () => { 'use server'; await deleteTeam(team.id); }}
              redirectTo="/teams"
              confirm={`מחיקת הקבוצה "${team.name}"? פעולה זו אינה הפיכה ותסיר את כל השחקנים שלה.`}
            />
          </div>
        )}
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{he.nav.players}</CardTitle>
              {canManageThisTeam && <Link href={`/players?team=${team.id}`} className="text-sm text-pitch-700 hover:underline">{he.player.create}</Link>}
            </CardHeader>
            <CardBody>
              {(players ?? []).length === 0 ? <EmptyState title="עוד אין שחקנים בקבוצה" /> : (
                <ul className="divide-y divide-ink-100">
                  {players!.map(p => (
                    <li key={p.id} className="py-3 flex items-center gap-3">
                      <span className="size-8 rounded-full bg-ink-100 grid place-items-center text-sm font-display font-bold">{p.squad_number ?? '—'}</span>
                      <Link href={`/players/${p.id}`} className="flex-1 truncate font-medium hover:underline">{p.display_name}</Link>
                      <Badge tone="neutral">{he.player.positions[p.position]}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{he.team.members}</CardTitle>
            {isAdmin && <Link href={`/invitations?team=${team.id}`} className="text-sm text-pitch-700 hover:underline">{he.team.inviteMember}</Link>}
          </CardHeader>
          <CardBody>
            <ul className="space-y-3">
              {(members ?? []).map((m: any) => (
                <li key={m.user_id} className="flex items-center gap-3">
                  <div className="size-8 rounded-full bg-ink-200 overflow-hidden">
                    {m.profile?.avatar_url && <img src={m.profile.avatar_url} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0 text-sm">
                    <div className="truncate">{m.profile?.full_name ?? m.profile?.email}</div>
                  </div>
                  <Badge tone="pitch">{m.role}</Badge>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
