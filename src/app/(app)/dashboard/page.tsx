import Link from 'next/link';
import { Plus, Trophy, ShieldCheck, ClipboardList, UserPlus, Mail, ArrowLeft, Crown } from 'lucide-react';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getIsAppAdmin } from '@/lib/auth/app-admin';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty';
import { MatchCard } from '@/components/match/match-card';
import { TeamBadge } from '@/components/team/team-badge';
import { attachScores } from '@/lib/queries/match-scores';
import { he } from '@/lib/i18n/he';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAdmin = await getIsAppAdmin();

  // What this user manages — drives the whole personalised section.
  const [{ data: myTeamMemberships }, { data: myCompMemberships }] = await Promise.all([
    user ? supabase.from('team_members').select('role, team:teams(id, name, slug, short_name, primary_color, crest_shape, crest_text_color, home_venue)').eq('user_id', user.id).in('role', ['manager', 'assistant']) : Promise.resolve({ data: [] as any[] }),
    user ? supabase.from('competition_members').select('role, competition:competitions(id, name, slug, type, status, season, format)').eq('user_id', user.id).in('role', ['organiser', 'admin']) : Promise.resolve({ data: [] as any[] }),
  ]);
  const myTeams = (myTeamMemberships ?? []).map((m: any) => m.team).filter(Boolean);
  const myCompetitions = (myCompMemberships ?? []).map((m: any) => m.competition).filter(Boolean);
  const hasAnyManagement = isAdmin || myTeams.length > 0 || myCompetitions.length > 0;

  // Map each of MY teams → competitions it's enrolled in, so we can
  // group the team cards under the competition they actually play in
  // (a manager of 20 teams shouldn't see a flat wall of crests).
  const myTeamIdList = myTeams.map((t: any) => t.id);
  const { data: compTeamsRaw } = myTeamIdList.length > 0
    ? await supabase.from('competition_teams')
        .select('team_id, competition:competitions(id, name, type, status, season)')
        .in('team_id', myTeamIdList)
    : { data: [] as any[] };
  const compsByTeam = new Map<string, any[]>();
  for (const row of (compTeamsRaw ?? []) as any[]) {
    const comp = Array.isArray(row.competition) ? row.competition[0] : row.competition;
    if (!comp) continue;
    const arr = compsByTeam.get(row.team_id) ?? [];
    arr.push(comp);
    compsByTeam.set(row.team_id, arr);
  }
  // competitionId → { competition, teams[] } ; '' for friendlies / unenrolled
  type TeamGroup = { competition: any | null; teams: any[] };
  const teamGroups = new Map<string, TeamGroup>();
  const NO_COMP_KEY = '__none__';
  for (const t of myTeams as any[]) {
    const comps = compsByTeam.get(t.id) ?? [];
    if (comps.length === 0) {
      const g = teamGroups.get(NO_COMP_KEY) ?? { competition: null, teams: [] };
      g.teams.push(t);
      teamGroups.set(NO_COMP_KEY, g);
    } else {
      for (const c of comps) {
        const g = teamGroups.get(c.id) ?? { competition: c, teams: [] };
        g.teams.push(t);
        teamGroups.set(c.id, g);
      }
    }
  }
  // Real competitions first (newest season desc), unenrolled last.
  const sortedTeamGroups = Array.from(teamGroups.values()).sort((a, b) => {
    if (!a.competition) return 1;
    if (!b.competition) return -1;
    return (b.competition.season ?? '').localeCompare(a.competition.season ?? '');
  });

  const [activeComps, upcoming, recentResults] = await Promise.all([
    supabase.from('competitions').select('id, slug, name, type, status, season, format').in('status', ['active', 'draft']).order('created_at', { ascending: false }).limit(6),
    supabase.from('matches')
      .select('id, scheduled_at, status, venue, home_team_id, away_team_id, competition_id, home:teams!home_team_id(id, name, short_name, primary_color, crest_shape, crest_text_color), away:teams!away_team_id(id, name, short_name, primary_color, crest_shape, crest_text_color)')
      .eq('status', 'scheduled')
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(6),
    supabase.from('matches')
      .select('id, finished_at, status, venue, home_team_id, away_team_id, home:teams!home_team_id(id, name, short_name, primary_color, crest_shape, crest_text_color), away:teams!away_team_id(id, name, short_name, primary_color, crest_shape, crest_text_color)')
      .eq('status', 'finished')
      .order('finished_at', { ascending: false })
      .limit(6),
  ]);
  const recentWithScores = await attachScores(recentResults.data ?? []);

  // Upcoming matches involving teams I manage (so the manager sees their next game first)
  const myTeamIds = new Set(myTeams.map((t: any) => t.id));
  const myUpcoming = (upcoming.data ?? []).filter((m: any) =>
    myTeamIds.has(m.home_team_id) || myTeamIds.has(m.away_team_id),
  );

  return (
    <div className="space-y-8">
      {/* Quick actions or read-only notice */}
      {isAdmin ? (
        <div className="grid sm:grid-cols-3 gap-3">
          <QuickAction href="/matches/new" icon={ClipboardList} label={he.dashboard.createMatch} />
          <QuickAction href="/teams/new" icon={ShieldCheck} label={he.dashboard.addTeam} />
          <QuickAction href="/competitions/new" icon={Trophy} label={he.competition.create} />
        </div>
      ) : !hasAnyManagement ? (
        <Card className="p-5 bg-pitch-50 dark:bg-pitch-950/40 border-pitch-200 dark:border-pitch-800">
          <div className="text-sm text-ink-700 dark:text-ink-200">
            <strong>גישת קריאה בלבד.</strong> כדי לערוך נתונים אתה צריך הזמנה ספציפית מהמארגנים.
          </div>
        </Card>
      ) : null}

      {/* My management area */}
      {hasAnyManagement && (myTeams.length > 0 || myCompetitions.length > 0) && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Crown className="size-5 text-amber-500" />
            <h2 className="font-display text-lg font-semibold text-ink-900 dark:text-ink-50">בניהול שלי</h2>
          </div>

          {/* Teams I manage — grouped by competition */}
          {myTeams.length > 0 && (
            <div className="mb-5 space-y-4">
              <div className="text-xs font-medium text-ink-500 dark:text-ink-400 uppercase tracking-wide">קבוצות</div>
              {sortedTeamGroups.map((g: any, gi: number) => (
                <div key={g.competition?.id ?? `none-${gi}`} className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    {g.competition ? (
                      <>
                        <Trophy className="size-4 text-amber-500" />
                        <Link href={`/competitions/${g.competition.id}`} className="font-medium text-ink-800 dark:text-ink-100 hover:text-pitch-700 dark:hover:text-pitch-400 hover:underline">
                          {g.competition.name}
                        </Link>
                        <Badge tone={g.competition.status === 'active' ? 'success' : g.competition.status === 'finished' ? 'neutral' : 'warning'}>
                          {g.competition.status === 'active' ? 'פעילה' : g.competition.status === 'finished' ? 'הסתיימה' : g.competition.status === 'draft' ? 'טיוטה' : g.competition.status}
                        </Badge>
                        <span className="text-xs text-ink-400 dark:text-ink-500">· {g.teams.length} קבוצות</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="size-4 text-ink-500" />
                        <span className="font-medium text-ink-800 dark:text-ink-100">ללא תחרות</span>
                        <span className="text-xs text-ink-400 dark:text-ink-500">· {g.teams.length} קבוצות</span>
                      </>
                    )}
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {g.teams.map((t: any) => (
                      <div key={t.id} className="relative group rounded-xl2 bg-white dark:bg-ink-800 border border-ink-100 dark:border-ink-700 hover:border-pitch-300 dark:hover:border-pitch-700 hover:shadow-card transition-all">
                        <Link href={`/teams/${t.id}`} className="absolute inset-0 rounded-xl2" aria-label={t.name} />
                        <div className="p-5 flex items-center gap-3 relative pointer-events-none">
                          <TeamBadge team={t} size="lg" />
                          <div className="min-w-0 flex-1">
                            <div className="font-display font-semibold text-ink-900 dark:text-ink-50 truncate group-hover:text-pitch-700 dark:group-hover:text-pitch-300 transition-colors">{t.name}</div>
                            {t.home_venue && <div className="text-xs text-ink-500 dark:text-ink-400 truncate">{t.home_venue}</div>}
                          </div>
                        </div>
                        <div className="absolute top-3 end-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link href={`/players?team=${t.id}`} title="הוספת שחקן" className="relative z-10 size-8 rounded-lg bg-white dark:bg-ink-700 ring-1 ring-ink-200 dark:ring-ink-600 grid place-items-center hover:bg-pitch-50 dark:hover:bg-pitch-950 hover:ring-pitch-300">
                            <UserPlus className="size-4" />
                          </Link>
                          {isAdmin && (
                            <Link href={`/invitations?team=${t.id}`} title="הזמנה" className="relative z-10 size-8 rounded-lg bg-white dark:bg-ink-700 ring-1 ring-ink-200 dark:ring-ink-600 grid place-items-center hover:bg-pitch-50 dark:hover:bg-pitch-950 hover:ring-pitch-300">
                              <Mail className="size-4" />
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Competitions I organise */}
          {myCompetitions.length > 0 && (
            <div>
              <div className="text-xs font-medium text-ink-500 dark:text-ink-400 uppercase tracking-wide mb-2">תחרויות</div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {myCompetitions.map((c: any) => (
                  <Link key={c.id} href={`/competitions/${c.id}`} className="rounded-xl2 border border-ink-100 dark:border-ink-700 p-4 bg-white dark:bg-ink-800 hover:border-pitch-300 dark:hover:border-pitch-700 transition-colors">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <Badge tone="pitch">{he.competition.types[c.type as keyof typeof he.competition.types]}</Badge>
                      <Badge tone={c.status === 'active' ? 'success' : 'warning'}>{c.status === 'active' ? 'פעילה' : c.status}</Badge>
                    </div>
                    <div className="font-display font-semibold text-ink-900 dark:text-ink-50 truncate">{c.name}</div>
                    <div className="text-xs text-ink-500 dark:text-ink-400 mt-1">{c.season ?? ''}</div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Next matches involving my teams */}
          {myUpcoming.length > 0 && (
            <div className="mt-5">
              <div className="text-xs font-medium text-ink-500 dark:text-ink-400 uppercase tracking-wide mb-2">המשחקים הקרובים שלי</div>
              <div className="space-y-2">
                {myUpcoming.map((m: any) => (
                  <MatchCard key={m.id} id={m.id} home={m.home} away={m.away} status={m.status} scheduledAt={m.scheduled_at} venue={m.venue} />
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Active competitions — visible to everyone, with a friendly empty state */}
      {!isAdmin && (
        <Card>
          <CardHeader className="flex items-center justify-between flex-row">
            <CardTitle>{he.dashboard.activeCompetitions}</CardTitle>
            <Link href="/competitions" className="text-sm text-pitch-700 dark:text-pitch-400 hover:underline">הכל</Link>
          </CardHeader>
          <CardBody>
            {(activeComps.data ?? []).length === 0 ? (
              <p className="text-sm text-ink-400 dark:text-ink-500">אין כרגע תחרויות פעילות.</p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {activeComps.data!.map((c: any) => (
                  <Link key={c.id} href={`/competitions/${c.id}`} className="rounded-xl2 border border-ink-100 dark:border-ink-700 p-4 bg-white dark:bg-ink-800 hover:border-pitch-300 dark:hover:border-pitch-700 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <Badge tone="pitch">{he.competition.types[c.type as keyof typeof he.competition.types]}</Badge>
                      <Badge tone={c.status === 'active' ? 'success' : 'warning'}>{c.status === 'active' ? 'פעילה' : 'טיוטה'}</Badge>
                    </div>
                    <div className="font-display font-bold text-base text-ink-900 dark:text-ink-50 line-clamp-1">{c.name}</div>
                    <div className="mt-1 text-xs text-ink-500 dark:text-ink-400">{c.season ?? ''}</div>
                  </Link>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Admin: full active competitions section */}
      {isAdmin && (
        <Card>
          <CardHeader className="flex items-center justify-between flex-row">
            <CardTitle>{he.dashboard.activeCompetitions}</CardTitle>
            <Link href="/competitions" className="text-sm text-pitch-700 dark:text-pitch-400 hover:underline">הכל</Link>
          </CardHeader>
          <CardBody>
            {(activeComps.data ?? []).length === 0 ? (
              <EmptyState title="עדיין אין תחרויות פעילות" action={<Link href="/competitions/new" className="rounded-xl bg-pitch-600 text-white px-4 h-10 inline-flex items-center font-medium">{he.competition.create}</Link>} />
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {activeComps.data!.map((c: any) => (
                  <Link key={c.id} href={`/competitions/${c.id}`} className="rounded-xl2 border border-ink-100 dark:border-ink-700 p-4 bg-white dark:bg-ink-800 hover:border-pitch-300 dark:hover:border-pitch-700 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <Badge tone="pitch">{he.competition.types[c.type as keyof typeof he.competition.types]}</Badge>
                      <Badge tone={c.status === 'active' ? 'success' : 'warning'}>{c.status === 'active' ? 'פעילה' : 'טיוטה'}</Badge>
                    </div>
                    <div className="font-display font-bold text-base text-ink-900 dark:text-ink-50 line-clamp-1">{c.name}</div>
                    <div className="mt-1 text-xs text-ink-500 dark:text-ink-400">{c.season ?? ''}</div>
                  </Link>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Generic upcoming / recent */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>{he.dashboard.upcoming}</CardTitle></CardHeader>
          <CardBody>
            {(upcoming.data ?? []).length === 0 ? <p className="text-sm text-ink-400">{he.dashboard.noMatches}</p> : (
              <div className="space-y-2">
                {upcoming.data!.map((m: any) => (
                  <MatchCard key={m.id} id={m.id} home={m.home} away={m.away} status={m.status} scheduledAt={m.scheduled_at} venue={m.venue} />
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>{he.dashboard.recentResults}</CardTitle></CardHeader>
          <CardBody>
            {recentWithScores.length === 0 ? <p className="text-sm text-ink-400">{he.dashboard.noResults}</p> : (
              <div className="space-y-2">
                {recentWithScores.map((m: any) => (
                  <MatchCard key={m.id} id={m.id} home={m.home} away={m.away} status={m.status} scheduledAt={m.finished_at} homeGoals={m.score?.home_goals} awayGoals={m.score?.away_goals} venue={m.venue} />
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function QuickAction({ href, icon: Icon, label }: { href: string; icon: any; label: string }) {
  return (
    <Link href={href} className="group rounded-xl2 bg-white dark:bg-ink-800 border border-ink-100 dark:border-ink-700 p-4 hover:border-pitch-300 dark:hover:border-pitch-700 hover:shadow-card transition-all flex items-center gap-3">
      <span className="size-11 rounded-xl bg-pitch-100 dark:bg-pitch-950 text-pitch-700 dark:text-pitch-300 grid place-items-center group-hover:bg-pitch-600 group-hover:text-white transition-colors">
        <Icon className="size-5" />
      </span>
      <span className="font-medium text-ink-900 dark:text-ink-100">{label}</span>
      <Plus className="ms-auto size-4 text-ink-400" />
    </Link>
  );
}
