import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { StandingsTable } from '@/components/standings/standings-table';
import { MatchCard } from '@/components/match/match-card';
import { Badge } from '@/components/ui/badge';
import { he } from '@/lib/i18n/he';
import { loadStandingsWithForm } from '@/lib/queries/standings';
import { attachScores } from '@/lib/queries/match-scores';

export const revalidate = 30;

export default async function PublicCompetitionPage({ params }: { params: { slug: string } }) {
  // params.slug arrives URL-decoded from Next.js. Hebrew slugs work either way.
  const slug = decodeURIComponent(params.slug);
  const supabase = getSupabaseServerClient();
  const { data: comp, error: compErr } = await supabase
    .from('competitions').select('*').eq('slug', slug).maybeSingle();
  if (compErr) console.error('public comp fetch error', compErr);
  if (!comp) notFound();

  const [standings, { data: rawMatches }, { data: topScorers }] = await Promise.all([
    loadStandingsWithForm(comp.id),
    supabase.from('matches')
      .select('id, scheduled_at, status, round_label, venue, home:teams!home_team_id(id, name, short_name, primary_color), away:teams!away_team_id(id, name, short_name, primary_color)')
      .eq('competition_id', comp.id)
      .order('scheduled_at', { ascending: true }),
    supabase.from('competition_top_scorers').select('player_id, display_name, goals').eq('competition_id', comp.id).order('goals', { ascending: false }).limit(10),
  ]);
  const matches = await attachScores(rawMatches ?? []);

  const rounds = new Map<string, any[]>();
  for (const m of matches as any[]) {
    const k = m.round_label ?? 'משחקים';
    const a = rounds.get(k) ?? []; a.push(m); rounds.set(k, a);
  }
  const finished = matches.filter(m => m.status === 'finished').length;

  return (
    <div className="min-h-screen bg-ink-50 dark:bg-[#0b1220] text-ink-900 dark:text-ink-100">
      <PublicHeader />
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8 space-y-8">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="text-sm text-ink-500 dark:text-ink-400">
              {comp.season ? `קיץ ${comp.season} · ` : ''}{he.competition.types[comp.type as keyof typeof he.competition.types]}{comp.rounds > 1 ? ` · ${comp.rounds} סבבים` : ' · סבב אחד'}
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold mt-1">{comp.name}</h1>
          </div>
          <Badge tone={comp.status === 'active' ? 'success' : 'neutral'}>{comp.status === 'active' ? 'פעילה' : comp.status}</Badge>
        </div>

        {comp.type === 'league' && (
          <section className="rounded-xl2 bg-white dark:bg-ink-800 border border-ink-100 dark:border-ink-700 p-6">
            <h2 className="font-display text-lg font-semibold mb-3">טבלה</h2>
            <StandingsTable rows={standings} />
            <p className="mt-3 text-xs text-ink-500 dark:text-ink-400 text-end">{finished} מתוך {matches.length} משחקים הסתיימו</p>
          </section>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 rounded-xl2 bg-white dark:bg-ink-800 border border-ink-100 dark:border-ink-700 p-6 space-y-5">
            <h2 className="font-display text-lg font-semibold">לוח משחקים</h2>
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
                      href={`/m/${m.id}`}
                      competitionType={comp.type as 'league' | 'cup'}
                      roundLabel={m.round_label ?? null}
                    />
                  ))}
                </div>
              </div>
            ))}
          </section>

          <section className="rounded-xl2 bg-white dark:bg-ink-800 border border-ink-100 dark:border-ink-700 p-6">
            <h2 className="font-display text-lg font-semibold mb-3">{he.competition.topScorers}</h2>
            <ol className="space-y-2">
              {(topScorers ?? []).map((s: any, i: number) => (
                <li key={s.player_id} className="flex items-center gap-3 text-sm">
                  <span className="w-5 text-ink-400 tabular">{i + 1}</span>
                  <Link href={`/p/${s.player_id}`} className="flex-1 truncate hover:underline">{s.display_name}</Link>
                  <span className="tabular font-display font-bold">{s.goals}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </main>
    </div>
  );
}

function PublicHeader() {
  return (
    <header className="sticky top-0 z-10 bg-white/80 dark:bg-ink-900/80 backdrop-blur border-b border-ink-100 dark:border-ink-800">
      <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-display font-bold">
          <span className="size-8 rounded-lg bg-pitch-600 text-white grid place-items-center">⚽</span>
          {he.app.name}
        </Link>
        <Link href="/login" className="text-sm font-medium text-pitch-700 dark:text-pitch-400 hover:underline">{he.nav.login}</Link>
      </div>
    </header>
  );
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const supabase = getSupabaseServerClient();
  const { data: comp } = await supabase.from('competitions').select('name').eq('slug', params.slug).single();
  return { title: comp?.name ?? 'תחרות' };
}
