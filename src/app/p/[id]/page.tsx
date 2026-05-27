import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { PlayerCard } from '@/components/player/player-card';
import { he } from '@/lib/i18n/he';

export const revalidate = 60;

export default async function PublicPlayerPage({ params }: { params: { id: string } }) {
  const supabase = getSupabaseServerClient();
  const { data: player } = await supabase
    .from('players')
    .select('*, team:teams(id, slug, name, primary_color, short_name), training_group:training_groups(id, name)')
    .eq('id', params.id)
    .single();
  if (!player) notFound();

  const { data: stats } = await supabase.rpc('player_stats', { p_player_id: params.id });
  const s = (stats?.[0] ?? {}) as Record<string, number>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-pitch-50 to-white dark:from-[#0b1220] dark:to-[#0e1a2e] text-ink-900 dark:text-ink-100">
      <header className="max-w-3xl mx-auto px-6 py-4">
        <Link href="/" className="flex items-center gap-2 font-display font-bold">
          <span className="size-8 rounded-lg bg-pitch-600 text-white grid place-items-center">⚽</span>{he.app.name}
        </Link>
      </header>
      <main className="max-w-3xl mx-auto p-6 grid lg:grid-cols-[360px_1fr] gap-6">
        <PlayerCard player={player as any} />
        <section className="rounded-xl2 bg-white dark:bg-ink-800 shadow-card border border-ink-100 dark:border-ink-700 p-6">
          <h2 className="font-display text-lg font-semibold mb-3 text-ink-900 dark:text-ink-50">סטטיסטיקה</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              [he.player.appearances, s.appearances ?? 0],
              [he.player.goals,       s.goals ?? 0],
              [he.player.assists,     s.assists ?? 0],
              [he.player.yellowCards, s.yellow_cards ?? 0],
              [he.player.redCards,    s.red_cards ?? 0],
              [he.player.minutes,     s.minutes ?? 0],
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-xl bg-ink-50 dark:bg-ink-700/50 p-3 text-center">
                <div className="font-display text-2xl font-bold tabular text-ink-900 dark:text-ink-50">{value as number}</div>
                <div className="text-xs text-ink-500 dark:text-ink-400 mt-1">{label as string}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-1.5 text-sm text-ink-500 dark:text-ink-400">
            {player.team && (
              <p>
                <span>קבוצה: </span>
                <Link href={`/t/${player.team.slug}`} className="text-pitch-700 dark:text-pitch-400 hover:underline font-medium">{player.team.name}</Link>
              </p>
            )}
            {(player as any).training_group?.name && (
              <p>
                <span>קבוצת אימון: </span>
                <span className="font-medium text-ink-900 dark:text-ink-100">{(player as any).training_group.name}</span>
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
