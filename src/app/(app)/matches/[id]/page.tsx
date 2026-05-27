import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DeleteButton } from '@/components/ui/delete-button';
import { deleteMatch } from '@/lib/actions/matches';
import { he } from '@/lib/i18n/he';
import { formatHebrewDate, formatHebrewTime, formatScore, contrastText } from '@/lib/utils';
import { LiveTracker } from '@/components/match/live-tracker';
import { RetroScoreForm } from '@/components/match/retro-score-form';
import { CancelEventButton } from '@/components/match/cancel-event-button';

export const dynamic = 'force-dynamic';

export default async function MatchDetailPage({ params }: { params: { id: string } }) {
  const supabase = getSupabaseServerClient();
  const { data: match, error: matchErr } = await supabase
    .from('matches')
    .select(`id, status, scheduled_at, started_at, venue, round_label, period_length_min, number_of_periods,
             competition_id, home_team_id, away_team_id,
             home:teams!home_team_id(id, name, short_name, primary_color, crest_url),
             away:teams!away_team_id(id, name, short_name, primary_color, crest_url),
             competition:competitions(id, name)`)
    .eq('id', params.id)
    .maybeSingle();
  if (matchErr) console.error('match fetch error', matchErr);
  if (!match) notFound();

  const [{ data: score }, { data: events }, { data: homePlayers }, { data: awayPlayers }, { data: { user } }] = await Promise.all([
    supabase.from('match_scores').select('home_goals, away_goals').eq('match_id', match.id).maybeSingle(),
    supabase.from('match_events')
      .select('id, event_type, period, minute, extra_minute, team_id, player_id, related_player_id, is_cancelled, payload, player:players(display_name)')
      .eq('match_id', match.id)
      .order('period').order('minute').order('extra_minute').order('recorded_at'),
    supabase.from('players').select('id, display_name, squad_number, position').eq('team_id', match.home_team_id).eq('is_active', true).order('squad_number'),
    supabase.from('players').select('id, display_name, squad_number, position').eq('team_id', match.away_team_id).eq('is_active', true).order('squad_number'),
    supabase.auth.getUser(),
  ]);
  (match as any).score = score ?? { home_goals: 0, away_goals: 0 };

  let canScore = false;
  let canManage = false;
  if (user) {
    try {
      const r = await supabase.rpc('can_score_match' as any, { p_match_id: match.id });
      canScore = r.data === true;
    } catch { /* default false */ }
    try {
      const r = await supabase.rpc('can_manage_match' as any, { p_match_id: match.id });
      canManage = r.data === true;
    } catch { /* default false */ }
  }

  const m: any = match;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3 text-sm text-ink-500 dark:text-ink-400 gap-3 flex-wrap">
          <div>{m.competition?.name ?? he.competition.types.friendly} {m.round_label ? `· ${m.round_label}` : ''}</div>
          <div className="flex items-center gap-2">
            <Badge tone={m.status === 'live' ? 'live' : m.status === 'finished' ? 'success' : 'neutral'}>
              {he.match[m.status as keyof typeof he.match] as string}
            </Badge>
            {canManage && (
              <>
                <Link href={`/matches/${m.id}/edit`} className="size-9 rounded-lg bg-white dark:bg-ink-800 ring-1 ring-ink-200 dark:ring-ink-700 grid place-items-center hover:bg-ink-50 dark:hover:bg-ink-700 text-ink-700 dark:text-ink-200" aria-label={he.common.edit}>
                  <Pencil className="size-4" />
                </Link>
                <DeleteButton
                  size="sm"
                  action={async () => { 'use server'; await deleteMatch(m.id); }}
                  redirectTo="/matches"
                  confirm={`מחיקת המשחק "${m.home.name} ${he.match.vs} ${m.away.name}"? פעולה זו תמחק גם את כל האירועים.`}
                />
              </>
            )}
          </div>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <TeamBlock team={m.home} align="end" />
          <div className="text-center">
            {m.status === 'finished' || m.status === 'live' ? (
              <div className="font-display text-4xl md:text-5xl font-bold tabular text-ink-900 dark:text-ink-50">
                {formatScore(m.score?.home_goals ?? 0, m.score?.away_goals ?? 0)}
              </div>
            ) : (
              <div className="font-display text-xl text-ink-600 dark:text-ink-300">{he.match.vs}</div>
            )}
            <div className="text-xs text-ink-500 dark:text-ink-400 mt-1">{formatHebrewDate(m.scheduled_at)} · {formatHebrewTime(m.scheduled_at)}</div>
            {m.venue && <div className="text-xs text-ink-400">{m.venue}</div>}
          </div>
          <TeamBlock team={m.away} align="start" />
        </div>
      </Card>

      {canScore && m.status !== 'finished' && (
        <LiveTracker
          matchId={m.id}
          home={{ id: m.home.id, name: m.home.name }}
          away={{ id: m.away.id, name: m.away.name }}
          homePlayers={homePlayers ?? []}
          awayPlayers={awayPlayers ?? []}
          numberOfPeriods={m.number_of_periods}
          periodLengthMin={m.period_length_min}
          startedAt={(match as any).started_at}
          status={m.status}
        />
      )}

      {canScore && m.status === 'scheduled' && (
        <RetroScoreForm matchId={m.id} />
      )}

      {/* Event timeline */}
      <Card>
        <CardHeader><CardTitle>אירועים</CardTitle></CardHeader>
        <CardBody>
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
                  {canManage && <CancelEventButton eventId={e.id} matchId={m.id} />}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function TeamBlock({ team, align }: { team: any; align: 'start' | 'end' }) {
  return (
    <div className={`flex items-center gap-3 ${align === 'end' ? 'justify-end' : 'justify-start'}`}>
      <div className="size-12 rounded-xl grid place-items-center font-display font-bold" style={{ background: team.primary_color, color: contrastText(team.primary_color) }}>
        {team.short_name ?? team.name.slice(0, 2)}
      </div>
      <div className="font-display font-semibold text-ink-900 dark:text-ink-50 truncate">{team.name}</div>
    </div>
  );
}
