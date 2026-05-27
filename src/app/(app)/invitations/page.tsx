import { getSupabaseServerClient } from '@/lib/supabase/server';
import { canInvite } from '@/lib/auth/capabilities';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { he } from '@/lib/i18n/he';
import { NewInvitationForm } from './_form';
import { RevokeInvitationButton } from '@/components/invitations/revoke-button';
import { formatHebrewDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function InvitationsPage({ searchParams }: { searchParams: { team?: string; competition?: string } }) {
  const supabase = getSupabaseServerClient();
  const canInviteAnyone = await canInvite();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: myTeams }, { data: myComps }, { data: invitations }] = await Promise.all([
    supabase.from('teams').select('id, name, team_members!inner(user_id, role)').eq('team_members.user_id', user!.id).in('team_members.role', ['manager','assistant']),
    supabase.from('competitions').select('id, name, competition_members!inner(user_id, role)').eq('competition_members.user_id', user!.id).in('competition_members.role', ['organiser','admin']),
    supabase.from('invitations').select('id, email, kind, status, team_role, competition_role, match_role, expires_at, created_at, team:teams(name), competition:competitions(name), match:matches(id)').order('created_at', { ascending: false }).limit(50),
  ]);

  return (
    <div className="space-y-6">
      {canInviteAnyone ? (
        <NewInvitationForm
          teams={(myTeams ?? []).map(t => ({ id: t.id, name: t.name }))}
          competitions={(myComps ?? []).map(c => ({ id: c.id, name: c.name }))}
          defaultTeam={searchParams.team}
          defaultCompetition={searchParams.competition}
        />
      ) : (
        <Card className="p-5 bg-pitch-50 border-pitch-200">
          <div className="text-sm text-ink-700 dark:text-ink-200">
            <strong>אין לך הרשאת הזמנה.</strong> רק מנהל קבוצה / מארגן תחרות יכול להזמין.
          </div>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>הזמנות אחרונות</CardTitle></CardHeader>
        <CardBody>
          {(invitations ?? []).length === 0 ? <p className="text-sm text-ink-400">{he.common.empty}</p> : (
            <ul className="divide-y divide-ink-100">
              {invitations!.map((i: any) => (
                <li key={i.id} className="py-3 flex items-center gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{i.email}</div>
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
                  {i.status === 'pending' && <RevokeInvitationButton id={i.id} />}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
