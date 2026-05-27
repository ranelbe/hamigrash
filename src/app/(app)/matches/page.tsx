import Link from 'next/link';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { canCreateMatch } from '@/lib/auth/capabilities';
import { Card, CardBody } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty';
import { MatchCard } from '@/components/match/match-card';
import { attachScores } from '@/lib/queries/match-scores';
import { he } from '@/lib/i18n/he';

export const dynamic = 'force-dynamic';

export default async function MatchesPage() {
  const supabase = getSupabaseServerClient();
  const canCreate = await canCreateMatch();
  const { data: rawMatches, error: mErr } = await supabase
    .from('matches')
    .select('id, scheduled_at, status, round_label, venue, home_team_id, away_team_id, competition_id, home:teams!home_team_id(id, name, short_name, primary_color, crest_shape, crest_text_color), away:teams!away_team_id(id, name, short_name, primary_color, crest_shape, crest_text_color), competition:competitions(id, name, type)')
    .order('created_at', { ascending: false })
    .limit(50);
  if (mErr) console.error('matches list error', mErr);
  const matches = await attachScores(rawMatches ?? []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">משחקים</h1>
          <p className="text-sm text-ink-500 dark:text-ink-400 mt-0.5">כל המשחקים — קרובים, חיים והסתיימו.</p>
        </div>
        {canCreate && <Link href="/matches/new" className="rounded-xl bg-pitch-600 text-white px-4 h-10 inline-flex items-center font-medium hover:bg-pitch-700">{he.match.create}</Link>}
      </div>

      {matches.length === 0 ? (
        <EmptyState title={he.dashboard.noMatches} action={canCreate ? <Link href="/matches/new" className="rounded-xl bg-pitch-600 text-white px-4 h-10 inline-flex items-center font-medium">{he.match.create}</Link> : undefined} />
      ) : (
        <div className="space-y-2">
          {matches.map((m: any) => {
            const comp = Array.isArray(m.competition) ? m.competition[0] : m.competition;
            return (
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
                competitionType={comp ? (comp.type as 'league' | 'cup') : 'friendly'}
                competitionName={comp?.name ?? null}
                competitionId={comp?.id ?? null}
                roundLabel={m.round_label ?? null}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
