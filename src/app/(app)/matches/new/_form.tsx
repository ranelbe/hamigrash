'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { he } from '@/lib/i18n/he';
import { toast } from '@/lib/stores/toast';
import { createMatch, updateMatch } from '@/lib/actions/matches';
import { matchCreateSchema } from '@/lib/schemas';
import { useFormErrors } from '@/hooks/use-form-errors';

export type MatchFormInitial = {
  id?: string;
  competition_id?: string | null;
  home_team_id?: string;
  away_team_id?: string;
  scheduled_at?: string | null;
  venue?: string | null;
  round_label?: string | null;
  period_length_min?: number;
  number_of_periods?: number;
};

type Props = {
  teams: { id: string; name: string }[];
  competitions: { id: string; name: string; format: string }[];
  initial?: MatchFormInitial;
};

// Datetime-local needs YYYY-MM-DDTHH:mm (no seconds, no timezone).
function toLocalInput(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function MatchForm({ teams, competitions, initial }: Props) {
  const router = useRouter();
  const editing = !!initial?.id;
  const [submitting, setSubmitting] = useState(false);
  const { errors, validate, clear } = useFormErrors();
  const [form, setForm] = useState({
    competition_id: initial?.competition_id ?? '',
    home_team_id: initial?.home_team_id ?? '',
    away_team_id: initial?.away_team_id ?? '',
    scheduled_at: toLocalInput(initial?.scheduled_at),
    venue: initial?.venue ?? '',
    round_label: initial?.round_label ?? '',
    period_length_min: initial?.period_length_min ?? 45,
    number_of_periods: initial?.number_of_periods ?? 2,
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      competition_id: form.competition_id || null,
      home_team_id: form.home_team_id,
      away_team_id: form.away_team_id,
      scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
      venue: form.venue || undefined,
      round_label: form.round_label || undefined,
      period_length_min: form.period_length_min,
      number_of_periods: form.number_of_periods,
    };
    const parsed = validate(matchCreateSchema, payload);
    if (!parsed) { toast.error('יש לתקן את השדות המסומנים'); return; }
    setSubmitting(true);
    try {
      if (editing) {
        await updateMatch(initial!.id!, parsed as any);
        toast.success('המשחק עודכן');
        router.push(`/matches/${initial!.id}`);
      } else {
        const m = await createMatch(parsed as any);
        toast.success('המשחק נוצר');
        router.push(`/matches/${m.id}`);
      }
    } catch (e: any) {
      toast.error(e.message ?? 'הפעולה נכשלה');
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <Card>
        <CardHeader><CardTitle>{editing ? he.common.edit : he.match.create}</CardTitle></CardHeader>
        <CardBody>
          <form className="space-y-4" onSubmit={submit} noValidate>
            <Select label={he.nav.competitions} value={form.competition_id} onChange={e => setForm(f => ({ ...f, competition_id: e.target.value }))} disabled={editing}>
              <option value="">{he.competition.types.friendly}</option>
              {competitions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <div className="grid sm:grid-cols-2 gap-4">
              <Select label={he.match.home} value={form.home_team_id} onChange={e => { clear('home_team_id'); setForm(f => ({ ...f, home_team_id: e.target.value })); }} disabled={editing} error={errors.home_team_id}>
                <option value="">— בחירת קבוצה —</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
              <Select label={he.match.away} value={form.away_team_id} onChange={e => { clear('away_team_id'); setForm(f => ({ ...f, away_team_id: e.target.value })); }} disabled={editing} error={errors.away_team_id}>
                <option value="">— בחירת קבוצה —</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input type="datetime-local" label="מועד" value={form.scheduled_at} onChange={e => { clear('scheduled_at'); setForm(f => ({ ...f, scheduled_at: e.target.value })); }} error={errors.scheduled_at} />
              <Input label="מגרש" value={form.venue ?? ''} onChange={e => { clear('venue'); setForm(f => ({ ...f, venue: e.target.value })); }} error={errors.venue} placeholder="לדוגמה: בלומפילד" />
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <Input label="סיבוב/שלב" value={form.round_label ?? ''} onChange={e => { clear('round_label'); setForm(f => ({ ...f, round_label: e.target.value })); }} error={errors.round_label} placeholder="מחזור 1" />
              <Input type="number" label="דקות במחצית" value={form.period_length_min} onChange={e => { clear('period_length_min'); setForm(f => ({ ...f, period_length_min: +e.target.value })); }} hint="1–60" error={errors.period_length_min} />
              <Input type="number" label="מחציות" value={form.number_of_periods} onChange={e => { clear('number_of_periods'); setForm(f => ({ ...f, number_of_periods: +e.target.value })); }} hint="1–4" error={errors.number_of_periods} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" loading={submitting}>{editing ? he.common.save : he.common.create}</Button>
              <Button variant="ghost" type="button" onClick={() => router.back()}>{he.common.cancel}</Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}

export function NewMatchForm({ teams, competitions }: Omit<Props, 'initial'>) {
  return <MatchForm teams={teams} competitions={competitions} />;
}
