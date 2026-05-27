import Link from 'next/link';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getIsAppAdmin } from '@/lib/auth/app-admin';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty';
import { TeamBadge } from '@/components/team/team-badge';
import { he } from '@/lib/i18n/he';

export const dynamic = 'force-dynamic';

export default async function TeamsPage() {
  const supabase = getSupabaseServerClient();
  const isAdmin = await getIsAppAdmin();

  // Show every team — public read. Edit/delete still gated on the detail page.
  const { data: teams } = await supabase
    .from('teams')
    .select('id, slug, name, short_name, primary_color, secondary_color, crest_shape, crest_text_color, home_venue')
    .order('name', { ascending: true });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-ink-50">קבוצות</h1>
          <p className="text-sm text-ink-500 dark:text-ink-400 mt-0.5">כל הקבוצות הרשומות במערכת.</p>
        </div>
        {isAdmin && (
          <Link href="/teams/new" className="rounded-xl bg-pitch-600 text-white px-4 h-10 inline-flex items-center font-medium hover:bg-pitch-700">
            {he.team.create}
          </Link>
        )}
      </div>

      {(teams ?? []).length === 0 ? (
        <EmptyState title={he.team.noTeams} action={isAdmin ? <Link href="/teams/new" className="rounded-xl bg-pitch-600 text-white px-4 h-10 inline-flex items-center font-medium">{he.team.create}</Link> : undefined} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams!.map(t => (
            <Link key={t.id} href={`/teams/${t.id}`}>
              <Card className="p-5 hover:border-pitch-300 dark:hover:border-pitch-700 transition-colors h-full">
                <div className="flex items-center gap-4">
                  <TeamBadge team={t as any} size="lg" />
                  <div className="min-w-0">
                    <div className="font-display font-semibold text-ink-900 dark:text-ink-50 truncate">{t.name}</div>
                    <div className="text-xs text-ink-500 dark:text-ink-400 truncate">{t.home_venue ?? ' '}</div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
