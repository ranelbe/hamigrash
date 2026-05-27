import Link from 'next/link';
import { Plus, Trophy, ShieldCheck, ClipboardList, Crown } from 'lucide-react';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getIsAppAdmin } from '@/lib/auth/app-admin';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty';
import { MatchCard } from '@/components/match/match-card';
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

  // Per-competition team counts (so each competition card shows '10 קבוצות'
  // — still useful info — without dumping every team on the dashboard).
  const myCompIds = myCompetitions.map((c: any) => c.id);
  const { data: enrolmentRows } = myCompIds.length > 0
    ? await supabase.from('competition_teams')
        .select('competition_id, team_id')
        .in('competition_id', myCompIds)
    : { data: [] as any[] };
  const teamCountByComp = new Map<string, number>();
  const enrolledTeamIds = new Set<string>();
  for (const r of (enrolmentRows ?? []) as any[]) {
    teamCountByComp.set(r.competition_id, (teamCountByComp.get(r.competition_id) ?? 0) + 1);
    enrolledTeamIds.add(r.team_id);
  }
  // Teams the user manages that aren't enrolled in any competition — orphans
  // worth surfacing as a single link so they're not invisible.
  const orphanTeamCount = myTeams.filter((t: any) => !enrolledTeamIds.has(t.id)).length;

  const [activeComps, upcoming, recentResults] = await Promise.all([
    supabase.from('competitions').select('id, slug, name, type, status, season, format').in('status', ['active', 'draft']).order('created_at', { ascending: false }).limit(6),
    supabase.from('matches')
      .select('id, scheduled_at, status, venue, round_label, home_team_id, away_team_id, competition_id, competition:competitions(id, name, type), home:teams!home_team_id(id, name, short_name, primary_color, crest_shape, crest_text_color), away:teams!away_team_id(id, name, short_name, primary_color, crest_shape, crest_text_color)')
      .eq('status', 'scheduled')
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(6),
    supabase.from('matches')
      .select('id, finished_at, status, venue, round_label, home_team_id, away_team_id, competition_id, competition:competitions(id, name, type), home:teams!home_team_id(id, name, short_name, primary_color, crest_shape, crest_text_color), away:teams!away_team_id(id, name, short_name, primary_color, crest_shape, crest_text_color)')
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

          {/* Competitions I organise — clicking into one shows ITS teams.
              We intentionally don't dump every team here: an admin of
              5 competitions × 10 teams would see a 50-team wall. */}
          {myCompetitions.length > 0 && (
            <div className="mb-5">
              <div className="text-xs font-medium text-ink-500 dark:text-ink-400 uppercase tracking-wide mb-2">תחרויות</div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {myCompetitions.map((c: any) => {
                  const tCount = teamCountByComp.get(c.id) ?? 0;
                  return (
                    <Link key={c.id} href={`/competitions/${c.id}`} className="rounded-xl2 border border-ink-100 dark:border-ink-700 p-4 bg-white dark:bg-ink-800 hover:border-pitch-300 dark:hover:border-pitch-700 transition-colors">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <Badge tone={c.type === 'cup' ? 'warning' : 'pitch'}>
                          {he.competition.types[c.type as keyof typeof he.competition.types]}
                        </Badge>
                        <Badge tone={c.status === 'active' ? 'success' : c.status === 'finished' ? 'neutral' : 'warning'}>
                          {c.status === 'active' ? 'פעילה' : c.status === 'finished' ? 'הסתיימה' : c.status === 'draft' ? 'טיוטה' : c.status}
                        </Badge>
                      </div>
                      <div className="font-display font-semibold text-ink-900 dark:text-ink-50 truncate">{c.name}</div>
                      <div className="mt-1 flex items-center justify-between text-xs text-ink-500 dark:text-ink-400">
                        <span>{c.season ?? ''}</span>
                        <span className="inline-flex items-center gap-1">
                          <ShieldCheck className="size-3" />
                          {tCount} קבוצות
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Single-line link for teams that aren't in any competition —
              they'd otherwise be invisible from the dashboard. */}
          {orphanTeamCount > 0 && (
            <div className="mb-5">
              <Link href="/teams" className="inline-flex items-center gap-1.5 text-sm text-pitch-700 dark:text-pitch-400 hover:underline">
                <ShieldCheck className="size-4" />
                {orphanTeamCount} קבוצות ללא תחרות
                <span className="text-ink-400">→</span>
              </Link>
            </div>
          )}

          {/* Next matches involving my teams */}
          {myUpcoming.length > 0 && (
            <div className="mt-5">
              <div className="text-xs font-medium text-ink-500 dark:text-ink-400 uppercase tracking-wide mb-2">המשחקים הקרובים שלי</div>
              <div className="space-y-2">
                {myUpcoming.map((m: any) => (
                  <MatchCard key={m.id} {...matchCardProps(m)} scheduledAt={m.scheduled_at} />
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
                  <MatchCard key={m.id} {...matchCardProps(m)} scheduledAt={m.scheduled_at} />
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
                  <MatchCard key={m.id} {...matchCardProps(m)} scheduledAt={m.finished_at} homeGoals={m.score?.home_goals} awayGoals={m.score?.away_goals} />
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

// Pull the competition + round info off a `matches` row (PostgREST widens
// to-one joins to arrays) into MatchCard's prop shape. Friendlies (no
// competition) get type='friendly' so the card still shows a chip.
function matchCardProps(m: any) {
  const comp = Array.isArray(m.competition) ? m.competition[0] : m.competition;
  return {
    id: m.id,
    home: m.home,
    away: m.away,
    status: m.status,
    venue: m.venue,
    competitionType: (comp ? comp.type : 'friendly') as 'league' | 'cup' | 'friendly',
    competitionName: comp?.name ?? null,
    competitionId: comp?.id ?? null,
    roundLabel: m.round_label ?? null,
  };
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
