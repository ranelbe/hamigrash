import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { he } from '@/lib/i18n/he';
import { contrastText } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export const revalidate = 60;

export default async function PublicTeamPage({ params }: { params: { slug: string } }) {
  const supabase = getSupabaseServerClient();
  const { data: team } = await supabase.from('teams').select('*').eq('slug', params.slug).single();
  if (!team) notFound();

  const { data: players } = await supabase
    .from('players')
    .select('id, display_name, squad_number, position')
    .eq('team_id', team.id)
    .eq('is_active', true)
    .order('squad_number');

  return (
    <div className="min-h-screen bg-gradient-to-b from-pitch-50 to-white dark:from-[#0b1220] dark:to-[#0e1a2e] text-ink-900 dark:text-ink-100">
      <header className="max-w-3xl mx-auto px-6 py-4">
        <Link href="/" className="flex items-center gap-2 font-display font-bold">
          <span className="size-8 rounded-lg bg-pitch-600 text-white grid place-items-center">⚽</span>{he.app.name}
        </Link>
      </header>
      <main className="max-w-3xl mx-auto p-6 space-y-6">
        <section className="rounded-xl2 bg-white dark:bg-ink-800 shadow-card border border-ink-100 dark:border-ink-700 p-6 flex items-center gap-4">
          <div className="size-16 rounded-xl grid place-items-center text-2xl font-display font-bold" style={{ background: team.primary_color, color: contrastText(team.primary_color) }}>
            {team.short_name ?? team.name.slice(0, 2)}
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-ink-50">{team.name}</h1>
            <p className="text-sm text-ink-500 dark:text-ink-400">{team.home_venue}</p>
          </div>
        </section>

        <section className="rounded-xl2 bg-white dark:bg-ink-800 shadow-card border border-ink-100 dark:border-ink-700 p-6">
          <h2 className="font-display text-lg font-semibold mb-3 text-ink-900 dark:text-ink-50">{he.nav.players}</h2>
          <ul className="divide-y divide-ink-100 dark:divide-ink-700">
            {(players ?? []).map(p => (
              <li key={p.id} className="py-3 flex items-center gap-3">
                <span className="size-8 rounded-full bg-ink-100 dark:bg-ink-700 text-ink-700 dark:text-ink-200 grid place-items-center text-sm font-display font-bold">{p.squad_number ?? '—'}</span>
                <Link href={`/p/${p.id}`} className="flex-1 font-medium text-ink-900 dark:text-ink-100 hover:underline">{p.display_name}</Link>
                <Badge tone="neutral">{he.player.positions[p.position]}</Badge>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
