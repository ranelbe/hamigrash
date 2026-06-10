import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getIsAppAdmin } from '@/lib/auth/app-admin';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { he } from '@/lib/i18n/he';
import { NewInvitationForm } from './_form';
import { InvitationActions } from '@/components/invitations/invitation-actions';
import { ReshareButton } from '@/components/invitations/reshare-button';
import { formatHebrewDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function InvitationsPage({ searchParams }: { searchParams: { team?: string; competition?: string } }) {
  const supabase = getSupabaseServerClient();
  // Invitations screen is admin-only — only the app owner gatekeeps access.
  const isAdmin = await getIsAppAdmin();
  if (!isAdmin) redirect('/dashboard');

  // Admin sees ALL teams and competitions to invite people to.
  const [{ data: allTeams }, { data: allComps }, { data: invitations }] = await Promise.all([
    supabase.from('teams').select('id, name').order('name'),
    supabase.from('competitions').select('id, name').order('created_at', { ascending: false }),
    supabase.from('invitations').select('id, email, token, kind, status, team_role, competition_role, match_role, expires_at, created_at, team:teams(name), competition:competitions(name), match:matches(id)').order('created_at', { ascending: false }).limit(50),
  ]);

  return (
    <div className="space-y-6">
      <NewInvitationForm
        teams={(allTeams ?? []).map(t => ({ id: t.id, name: t.name }))}
        competitions={(allComps ?? []).map(c => ({ id: c.id, name: c.name }))}
        defaultTeam={searchParams.team}
        defaultCompetition={searchParams.competition}
      />

      <Card>
        <CardHeader><CardTitle>הזמנות אחרונות</CardTitle></CardHeader>
        <CardBody>
          {(invitations ?? []).length === 0 ? <p className="text-sm text-ink-400">{he.common.empty}</p> : (
            <ul className="divide-y divide-ink-100">
              {invitations!.map((i: any) => (
                <li key={i.id} className="py-3 flex items-center gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {i.email ?? <span className="text-ink-400 italic">קישור בלבד</span>}
                    </div>
                    <div className="text-xs text-ink-500 dark:text-ink-400">
                      {i.team?.name ?? i.competition?.name ?? `משחק #${i.match?.id?.slice(0,8)}`}
                      {' · '}
                      {i.team_role ?? i.competition_role ?? i.match_role}
                    </div>
                  </div>
                  <Badge tone={i.status === 'accepted' ? 'success' : i.status === 'pending' ? 'warning' : 'neutral'}>
                    {he.invitation[i.status as keyof typeof he.invitation] as string}
                  </Badge>
                  <span className="text-xs text-ink-400 tabular">{formatHebrewDate(i.expires_at)}</span>
                  {i.status === 'pending' && (
                    <ReshareButton
                      token={i.token}
                      email={i.email}
                      contextLabel={i.team?.name
                        ? `מנהל קבוצה — ${i.team.name}`
                        : i.competition?.name
                          ? `מארגן תחרות — ${i.competition.name}`
                          : ''}
                    />
                  )}
                  <InvitationActions id={i.id} status={i.status} />
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
