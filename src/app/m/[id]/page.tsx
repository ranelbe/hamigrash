import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { he } from '@/lib/i18n/he';
import { formatHebrewDate, formatHebrewTime, formatScore, contrastText } from '@/lib/utils';
import { PublicMatchLive } from './_live';

export const revalidate = 0;

export default async function PublicMatchPage({ params }: { params: { id: string } }) {
  const supabase = getSupabaseServerClient();
  const { data: match } = await supabase
    .from('matches')
    .select(`id, status, scheduled_at, venue, round_label, home_team_id, away_team_id,
             home:teams!home_team_id(name, short_name, primary_color),
             away:teams!away_team_id(name, short_name, primary_color),
             competition:competitions(name, slug)`)
    .eq('id', params.id)
    .maybeSingle();
  if (!match) notFound();

  const [{ data: score }, { data: events }] = await Promise.all([
    supabase.from('match_scores').select('home_goals, away_goals').eq('match_id', match.id).maybeSingle(),
    supabase.from('match_events')
      .select('id, event_type, period, minute, extra_minute, team_id, is_cancelled, player:players(display_name)')
      .eq('match_id', match.id)
      .order('period').order('minute').order('extra_minute'),
  ]);

  const m: any = { ...match, score: score ?? { home_goals: 0, away_goals: 0 } };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pitch-50 to-white dark:from-[#0b1220] dark:to-[#0e1a2e] text-ink-900 dark:text-ink-100">
      <header className="px-6 py-4 flex items-center justify-between max-w-3xl mx-auto">
        <Link href="/" className="flex items-center gap-2 font-display font-bold">
          <span className="size-8 rounded-lg bg-pitch-600 text-white grid place-items-center">⚽</span>
          {he.app.name}
        </Link>
        {m.competition?.slug && <Link href={`/c/${m.competition.slug}`} className="text-sm font-medium text-pitch-700 hover:underline">{m.competition.name}</Link>}
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-6">
        <section className="rounded-xl2 bg-white dark:bg-ink-800 shadow-cardLg border border-ink-100 dark:border-ink-700 p-6">
          <div className="flex items-center justify-between mb-3 text-sm text-ink-500 dark:text-ink-400">
            <span>{m.round_label ?? ''}</span>
            <Badge tone={m.status === 'live' ? 'live' : m.status === 'finished' ? 'success' : 'neutral'}>
              {he.match[m.status as keyof typeof he.match] as string}
            </Badge>
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <Side team={m.home} align="end" />
            <div className="text-center">
              {m.status === 'finished' || m.status === 'live'
                ? <div className="font-display text-5xl font-bold tabular text-ink-900 dark:text-ink-50">{formatScore(m.score?.home_goals ?? 0, m.score?.away_goals ?? 0)}</div>
                : <div className="font-display text-xl text-ink-600 dark:text-ink-300">{he.match.vs}</div>}
              <div className="text-xs text-ink-500 dark:text-ink-400 mt-1">{formatHebrewDate(m.scheduled_at)} · {formatHebrewTime(m.scheduled_at)}</div>
              {m.venue && <div className="text-xs text-ink-400 dark:text-ink-500">{m.venue}</div>}
            </div>
            <Side team={m.away} align="start" />
          </div>
        </section>

        {m.status === 'live' && <PublicMatchLive matchId={m.id} />}

        <section className="rounded-xl2 bg-white dark:bg-ink-800 shadow-card border border-ink-100 dark:border-ink-700 p-6">
          <h2 className="font-display text-lg font-semibold mb-3">אירועים</h2>
          {(events ?? []).filter((e: any) => !e.is_cancelled).length === 0 ? (
            <p className="text-sm text-ink-400">עוד אין אירועים.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {events!.filter((e: any) => !e.is_cancelled).map((e: any) => (
                <li key={e.id} className="flex items-center gap-3">
                  <span className="w-12 tabular text-ink-400">{e.minute ?? '—'}{e.extra_minute ? `+${e.extra_minute}` : ''}'</span>
                  <span className="font-medium">{he.match.events[e.event_type as keyof typeof he.match.events]}</span>
                  {e.player?.display_name && <span className="text-ink-600 dark:text-ink-300">— {e.player.display_name}</span>}
                  <span className="ms-auto text-xs text-ink-400">
                    {e.team_id === m.home_team_id ? m.home.short_name ?? m.home.name : e.team_id === m.away_team_id ? m.away.short_name ?? m.away.name : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

function Side({ team, align }: { team: any; align: 'start' | 'end' }) {
  return (
    <div className={`flex items-center gap-3 ${align === 'end' ? 'justify-end' : 'justify-start'}`}>
      <div className="size-12 rounded-xl grid place-items-center font-display font-bold" style={{ background: team.primary_color, color: contrastText(team.primary_color) }}>
        {team.short_name ?? team.name.slice(0, 2)}
      </div>
      <div className="font-display font-semibold text-ink-900 dark:text-ink-50 truncate">{team.name}</div>
    </div>
  );
}
