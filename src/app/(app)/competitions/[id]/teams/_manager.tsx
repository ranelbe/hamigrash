'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { he } from '@/lib/i18n/he';
import { contrastText } from '@/lib/utils';
import { toast } from '@/lib/stores/toast';
import { addTeamToCompetition, removeTeamFromCompetition } from '@/lib/actions/competitions';

type T = { id: string; name: string; primary_color: string; short_name: string | null };
type Enrolled = { team_id: string; group_label: string | null; seed: number | null; team: T | null };

export function TeamsManager({ competitionId, competitionName, enrolled, available }: {
  competitionId: string; competitionName: string; enrolled: Enrolled[]; available: T[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [, setNonce] = useState(0);

  function add(teamId: string) {
    start(async () => {
      try {
        await addTeamToCompetition(competitionId, teamId);
        toast.success('הקבוצה נוספה');
        router.refresh();
      } catch (e: any) {
        toast.error(e.message ?? 'הוספה נכשלה');
      }
    });
  }

  function remove(teamId: string) {
    if (!confirm('להסיר את הקבוצה מהתחרות?')) return;
    start(async () => {
      try {
        await removeTeamFromCompetition(competitionId, teamId);
        toast.success('הקבוצה הוסרה');
        router.refresh();
      } catch (e: any) {
        toast.error(e.message ?? 'הסרה נכשלה');
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm text-ink-500 dark:text-ink-400">{competitionName}</div>
        <h1 className="font-display text-2xl font-bold">{he.competition.addTeams}</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>קבוצות בתחרות ({enrolled.length})</CardTitle></CardHeader>
        <CardBody>
          {enrolled.length === 0 ? (
            <p className="text-sm text-ink-500 dark:text-ink-400">עוד לא רשומה אף קבוצה.</p>
          ) : (
            <ul className="divide-y divide-ink-100 dark:divide-ink-800">
              {enrolled.map(e => (
                <li key={e.team_id} className="py-3 flex items-center gap-3">
                  {e.team && (
                    <span className="size-9 rounded-lg grid place-items-center font-display font-bold text-sm" style={{ background: e.team.primary_color, color: contrastText(e.team.primary_color) }}>
                      {e.team.short_name ?? e.team.name.slice(0, 2)}
                    </span>
                  )}
                  <span className="flex-1 font-medium">{e.team?.name ?? '—'}</span>
                  <button onClick={() => remove(e.team_id)} disabled={pending}
                    className="size-9 rounded-lg grid place-items-center text-red-600 hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-40" aria-label={he.common.delete}>
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>קבוצות זמינות ({available.length})</CardTitle></CardHeader>
        <CardBody>
          {available.length === 0 ? (
            <p className="text-sm text-ink-500 dark:text-ink-400">כל הקבוצות כבר רשומות.</p>
          ) : (
            <ul className="divide-y divide-ink-100 dark:divide-ink-800">
              {available.map(t => (
                <li key={t.id} className="py-3 flex items-center gap-3">
                  <span className="size-9 rounded-lg grid place-items-center font-display font-bold text-sm" style={{ background: t.primary_color, color: contrastText(t.primary_color) }}>
                    {t.short_name ?? t.name.slice(0, 2)}
                  </span>
                  <span className="flex-1 font-medium">{t.name}</span>
                  <button onClick={() => add(t.id)} disabled={pending}
                    className="rounded-lg bg-pitch-600 text-white px-3 h-9 inline-flex items-center gap-1.5 font-medium hover:bg-pitch-700 disabled:opacity-40">
                    <Plus className="size-4" /> הוסף
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
