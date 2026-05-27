import Link from 'next/link';
import { Trophy, Calendar, ShieldCheck, ArrowLeft } from 'lucide-react';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getIsAppAdmin } from '@/lib/auth/app-admin';
import { Card, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty';
import { he } from '@/lib/i18n/he';

export const dynamic = 'force-dynamic';

export default async function CompetitionsPage() {
  const supabase = getSupabaseServerClient();
  const isAdmin = await getIsAppAdmin();
  const { data: comps } = await supabase
    .from('competitions')
    .select('id, slug, name, type, status, season, format, starts_on, ends_on')
    .order('status', { ascending: true })  // active first
    .order('created_at', { ascending: false });

  const teamCounts = new Map<string, number>();
  const matchCounts = new Map<string, { total: number; finished: number }>();
  if (comps && comps.length) {
    const ids = comps.map(c => c.id);
    const [{ data: cts }, { data: ms }] = await Promise.all([
      supabase.from('competition_teams').select('competition_id').in('competition_id', ids),
      supabase.from('matches').select('competition_id, status').in('competition_id', ids),
    ]);
    for (const ct of cts ?? []) teamCounts.set(ct.competition_id, (teamCounts.get(ct.competition_id) ?? 0) + 1);
    for (const m of ms ?? []) {
      const c = matchCounts.get(m.competition_id) ?? { total: 0, finished: 0 };
      c.total++;
      if (m.status === 'finished') c.finished++;
      matchCounts.set(m.competition_id, c);
    }
  }

  // Group by status for visual separation
  const groups = {
    active: (comps ?? []).filter(c => c.status === 'active'),
    draft:  (comps ?? []).filter(c => c.status === 'draft'),
    finished: (comps ?? []).filter(c => c.status === 'finished'),
    archived: (comps ?? []).filter(c => c.status === 'archived'),
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-ink-50">תחרויות</h1>
          <p className="text-sm text-ink-500 dark:text-ink-400 mt-0.5">ליגות, גביעים ומשחקי ידידות.</p>
        </div>
        {isAdmin && (
          <Link href="/competitions/new" className="rounded-xl bg-pitch-600 text-white px-4 h-10 inline-flex items-center gap-2 font-medium hover:bg-pitch-700">
            <Trophy className="size-4" />
            {he.competition.create}
          </Link>
        )}
      </div>

      {(comps ?? []).length === 0 ? (
        <EmptyState title="עדיין אין תחרויות" description="צור תחרות חדשה כדי להתחיל." action={isAdmin ? <Link href="/competitions/new" className="rounded-xl bg-pitch-600 text-white px-4 h-10 inline-flex items-center font-medium">{he.competition.create}</Link> : undefined} />
      ) : (
        <>
          {groups.active.length > 0 && <Section title="פעילות" comps={groups.active} teamCounts={teamCounts} matchCounts={matchCounts} />}
          {groups.draft.length > 0 && <Section title="טיוטות" comps={groups.draft} teamCounts={teamCounts} matchCounts={matchCounts} />}
          {groups.finished.length > 0 && <Section title="הסתיימו" comps={groups.finished} teamCounts={teamCounts} matchCounts={matchCounts} dim />}
          {groups.archived.length > 0 && <Section title="בארכיון" comps={groups.archived} teamCounts={teamCounts} matchCounts={matchCounts} dim />}
        </>
      )}
    </div>
  );
}

function Section({ title, comps, teamCounts, matchCounts, dim }: {
  title: string;
  comps: any[];
  teamCounts: Map<string, number>;
  matchCounts: Map<string, { total: number; finished: number }>;
  dim?: boolean;
}) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-ink-500 dark:text-ink-400 mb-3 uppercase tracking-wide">{title}</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {comps.map(c => <CompCard key={c.id} comp={c} teams={teamCounts.get(c.id) ?? 0} matches={matchCounts.get(c.id) ?? { total: 0, finished: 0 }} dim={dim} />)}
      </div>
    </section>
  );
}

function CompCard({ comp, teams, matches, dim }: any) {
  const typeStyle = comp.type === 'league' ? 'from-pitch-500 to-pitch-700' : comp.type === 'cup' ? 'from-amber-500 to-amber-700' : 'from-sky-500 to-sky-700';
  return (
    <Link href={`/competitions/${comp.id}`}>
      <Card className={`relative overflow-hidden hover:shadow-cardLg transition-shadow ${dim ? 'opacity-70' : ''}`}>
        {/* Accent strip */}
        <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${typeStyle}`} />
        <CardBody className="pt-5">
          <div className="flex items-start justify-between gap-2 mb-3">
            <Badge tone={comp.type === 'league' ? 'pitch' : comp.type === 'cup' ? 'warning' : 'neutral'}>
              {he.competition.types[comp.type as keyof typeof he.competition.types]}
            </Badge>
            <Badge tone={comp.status === 'active' ? 'success' : comp.status === 'finished' ? 'neutral' : 'warning'}>
              {statusLabel(comp.status)}
            </Badge>
          </div>

          <div className="font-display font-bold text-lg text-ink-900 dark:text-ink-50 line-clamp-2 min-h-[3.5rem]">{comp.name}</div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Stat icon={ShieldCheck} value={teams} label="קבוצות" />
            <Stat icon={Calendar} value={matches.total} label="משחקים" />
            <Stat icon={Trophy} value={`${matches.finished}/${matches.total || 0}`} label="הסתיימו" />
          </div>

          {comp.season && (
            <div className="mt-4 pt-3 border-t border-ink-100 dark:border-ink-700 flex items-center justify-between text-xs text-ink-500 dark:text-ink-400">
              <span>{comp.season ?? ''}</span>
              <span className="inline-flex items-center gap-1 text-pitch-700 dark:text-pitch-400 font-medium">
                לתחרות
                <ArrowLeft className="size-3" />
              </span>
            </div>
          )}
        </CardBody>
      </Card>
    </Link>
  );
}

function Stat({ icon: Icon, value, label }: { icon: any; value: number | string; label: string }) {
  return (
    <div className="rounded-lg bg-ink-50 dark:bg-ink-700/50 py-2 px-1">
      <div className="flex items-center justify-center gap-1 mb-0.5">
        <Icon className="size-3.5 text-ink-400 dark:text-ink-500" />
      </div>
      <div className="font-display font-bold text-base tabular text-ink-900 dark:text-ink-100">{value}</div>
      <div className="text-[10px] text-ink-500 dark:text-ink-400">{label}</div>
    </div>
  );
}

function statusLabel(s: string) {
  return { active: 'פעילה', draft: 'טיוטה', finished: 'הסתיימה', archived: 'בארכיון' }[s] ?? s;
}
