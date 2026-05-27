import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Settings, RotateCw, Plus } from 'lucide-react';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getIsAppAdmin } from '@/lib/auth/app-admin';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DeleteButton } from '@/components/ui/delete-button';
import { deleteCompetition } from '@/lib/actions/competitions';
import { he } from '@/lib/i18n/he';
import { StandingsTable } from '@/components/standings/standings-table';
import { MatchCard } from '@/components/match/match-card';
import { TeamBadge } from '@/components/team/team-badge';
import { GenerateFixturesButton } from './_fixtures-button';
import { ShareLinkCard } from './_share-link';
import { NextCupRoundButton } from '@/components/competition/next-cup-round-button';
import { loadStandingsWithForm } from '@/lib/queries/standings';
import { attachScores } from '@/lib/queries/match-scores';

export const dynamic = 'force-dynamic';

export default async function CompetitionDetail({ params }: { params: { id: string } }) {
  const supabase = getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: comp } = await supabase.from('competitions').select('*').eq('id', params.id).single();
  if (!comp) notFound();

  const [{ data: cm }, isAdmin, standings, { data: enrolled }, { data: rawMatches }] = await Promise.all([
    user ? supabase.from('competition_members').select('role').eq('competition_id', comp.id).eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null }),
    getIsAppAdmin(),
    loadStandingsWithForm(comp.id),
    supabase.from('competition_teams').select('team:teams(id, name, short_name, primary_color)').eq('competition_id', comp.id),
    supabase.from('matches')
      .select('id, scheduled_at, status, round_label, venue, home_team_id, away_team_id, home:teams!home_team_id(id, name, short_name, primary_color), away:teams!away_team_id(id, name, short_name, primary_color)')
      .eq('competition_id', comp.id)
      .order('scheduled_at', { ascending: true }),
  ]);
  const matches = await attachScores(rawMatches ?? []);
  const canManage = isAdmin || ['organiser', 'admin'].includes((cm as any)?.role ?? '');

  // Group matches by round_label
  const rounds = new Map<string, any[]>();
  for (const m of matches as any[]) {
    const key = m.round_label ?? 'משחקים';
    const arr = rounds.get(key) ?? [];
    arr.push(m);
    rounds.set(key, arr);
  }
  const finishedCount = matches.filter(m => m.status === 'finished').length;
  const totalCount = matches.length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="text-sm text-ink-500 dark:text-ink-400">
            {comp.season ? `קיץ ${comp.season} · ` : ''}{he.competition.types[comp.type as keyof typeof he.competition.types]}{comp.rounds > 1 ? ` · ${comp.rounds} סבבים` : ' · סבב אחד'}
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold mt-1">{comp.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={comp.status === 'active' ? 'success' : 'neutral'}>{comp.status === 'active' ? 'פעילה' : comp.status}</Badge>
          {canManage && (
            <>
              <Link href={`/competitions/${comp.id}/edit`} className="rounded-xl bg-white dark:bg-ink-800 ring-1 ring-ink-200 dark:ring-ink-700 px-3 h-10 inline-flex items-center gap-2 font-medium hover:bg-ink-50 dark:hover:bg-ink-700">
                <Settings className="size-4" />הגדרות
              </Link>
              <DeleteButton
                action={async () => { 'use server'; await deleteCompetition(comp.id); }}
                redirectTo="/competitions"
                confirm={`מחיקת התחרות "${comp.name}"?`}
              />
            </>
          )}
        </div>
      </div>

      {/* Public share link */}
      <ShareLinkCard competitionId={comp.id} slug={comp.slug} />

      {/* Enrolled teams */}
      {canManage && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>הוספת קבוצות</CardTitle>
              <p className="text-sm text-ink-500 dark:text-ink-400 mt-0.5">{enrolled?.length ?? 0} קבוצות בתחרות</p>
            </div>
            <div className="flex gap-2">
              <Link href={`/competitions/${comp.id}/teams`} className="rounded-xl bg-white dark:bg-ink-800 ring-1 ring-ink-200 dark:ring-ink-700 px-3 h-10 inline-flex items-center gap-2 font-medium hover:bg-ink-50 dark:hover:bg-ink-700">
                <Plus className="size-4" />ניהול
              </Link>
              <GenerateFixturesButton competitionId={comp.id} />
            </div>
          </CardHeader>
          <CardBody>
            {(enrolled ?? []).length === 0 ? (
              <p className="text-sm text-ink-500 dark:text-ink-400">עוד לא רשומה קבוצה.</p>
            ) : (
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                {(enrolled ?? []).map((e: any) => e.team && (
                  <Link key={e.team.id} href={`/teams/${e.team.id}`} className="flex items-center gap-3 rounded-xl border border-ink-100 dark:border-ink-700 px-4 py-3 hover:border-pitch-300 dark:hover:border-pitch-700 transition-colors">
                    <TeamBadge team={e.team} size="md" />
                    <span className="font-medium truncate">{e.team.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Standings */}
      {comp.type === 'league' && (
        <Card>
          <CardHeader>
            <CardTitle>טבלה</CardTitle>
          </CardHeader>
          <CardBody>
            <StandingsTable rows={standings} />
            <p className="mt-3 text-xs text-ink-500 dark:text-ink-400 text-end">
              {finishedCount} מתוך {totalCount} משחקים הסתיימו
            </p>
          </CardBody>
        </Card>
      )}

      {/* Cup-specific info banner — explains the bracket size + byes */}
      {comp.type === 'cup' && (enrolled ?? []).length >= 2 && (() => {
        const n = (enrolled ?? []).length;
        const totalRounds = Math.ceil(Math.log2(n));
        const totalGames = n - 1;
        const round0 = Math.floor(n / 2);
        const idealFirstRound = Math.pow(2, totalRounds - 1);
        const byes = idealFirstRound - round0;
        return (
          <Card className="p-4 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
            <div className="text-sm text-amber-900 dark:text-amber-200 space-y-1">
              <div className="font-medium">{n} קבוצות · {totalRounds} שלבים · {totalGames} משחקים סה"כ</div>
              {byes > 0 ? (
                <div>
                  השלב הראשון מציג רק {round0} משחקים — {byes} קבוצות מקבלות <strong>bye</strong> ועוברות
                  ישירות לשלב הבא. כשהשלב הנוכחי יסתיים, השלב הבא ייווצר אוטומטית עם הקבוצות שעלו.
                </div>
              ) : (
                <div>
                  הגביע מוצג שלב אחר שלב. עם סיום כל המשחקים בשלב, יווצר השלב הבא עם הזוכים.
                </div>
              )}
            </div>
          </Card>
        );
      })()}

      {/* Matches grouped by round */}
      {totalCount > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>לוח משחקים</CardTitle>
            {canManage && comp.type === 'cup' && <NextCupRoundButton competitionId={comp.id} />}
          </CardHeader>
          <CardBody className="space-y-6">
            {[...rounds.entries()].map(([round, ms]) => (
              <div key={round}>
                <div className="text-sm font-medium text-ink-500 dark:text-ink-400 mb-2">{round}</div>
                <div className="space-y-2">
                  {ms.map((m: any) => (
                    <MatchCard
                      key={m.id}
                      id={m.id}
                      home={m.home}
                      away={m.away}
                      status={m.status}
                      scheduledAt={m.scheduled_at}
                      homeGoals={m.score?.home_goals}
                      awayGoals={m.score?.away_goals}
                      venue={m.venue}
                      // On the competition page we already know the type +
                      // name (it's the page itself), so skip the redundant
                      // name chip and only show the round label.
                      competitionType={comp.type as 'league' | 'cup'}
                      roundLabel={m.round_label ?? null}
                    />
                  ))}
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
