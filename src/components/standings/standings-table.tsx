import Link from 'next/link';
import type { StandingRow } from '@/lib/supabase/database.types';
import { he } from '@/lib/i18n/he';
import { TeamBadge } from '@/components/team/team-badge';
import { FormIndicator } from './form-indicator';
import { cn } from '@/lib/utils';

export type StandingWithForm = StandingRow & {
  form?: ('W' | 'D' | 'L')[];
  team_primary_color?: string | null;
  team_short_name?: string | null;
};

export function StandingsTable({ rows }: { rows: StandingWithForm[] }) {
  if (!rows.length) return <p className="text-sm text-ink-400 py-6 text-center">{he.common.empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm tabular">
        <thead className="text-xs text-ink-500 dark:text-ink-400 border-b border-ink-100 dark:border-ink-700">
          <tr>
            <th className="text-start py-3 ps-3 w-8 font-medium">#</th>
            <th className="text-start py-3 font-medium">{he.standings.team}</th>
            <th className="text-center py-3 font-medium w-10">מ׳</th>
            <th className="text-center py-3 font-medium w-10">נ</th>
            <th className="text-center py-3 font-medium w-10">ת</th>
            <th className="text-center py-3 font-medium w-10">ה</th>
            <th className="text-center py-3 font-medium w-12">ש.ז</th>
            <th className="text-center py-3 font-medium w-12">ש.ס</th>
            <th className="text-center py-3 font-medium w-14">הפרש</th>
            <th className="text-center py-3 font-medium w-12 font-bold">נק׳</th>
            <th className="text-end py-3 pe-3 font-medium w-32">צורה</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.team_id} className="border-b border-ink-50 dark:border-ink-800 hover:bg-ink-50/60 dark:hover:bg-ink-800/60 transition-colors">
              <td className="ps-3 py-3 text-ink-400 dark:text-ink-500">{i + 1}</td>
              <td className="py-3">
                <Link href={`/teams/${r.team_id}`} className="flex items-center gap-3 hover:underline">
                  <TeamBadge team={{ name: r.team_name, short_name: r.team_short_name ?? r.team_name.slice(0, 2), primary_color: r.team_primary_color ?? '#475569' }} size="sm" />
                  <span className="font-medium text-ink-900 dark:text-ink-100">{r.team_name}</span>
                </Link>
              </td>
              <td className="text-center py-3">{r.played}</td>
              <td className="text-center py-3">{r.wins}</td>
              <td className="text-center py-3">{r.draws}</td>
              <td className="text-center py-3">{r.losses}</td>
              <td className="text-center py-3">{r.goals_for}</td>
              <td className="text-center py-3">{r.goals_against}</td>
              <td className={cn('text-center py-3 font-medium', r.goal_difference > 0 && 'text-pitch-600 dark:text-pitch-400', r.goal_difference < 0 && 'text-red-600 dark:text-red-400')}>
                {r.goal_difference > 0 ? `+${r.goal_difference}` : r.goal_difference}
              </td>
              <td className="text-center py-3 font-bold text-ink-900 dark:text-ink-50">{r.points}</td>
              <td className="text-end py-3 pe-3">
                {r.form && <FormIndicator results={r.form} />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
