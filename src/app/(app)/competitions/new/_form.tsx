'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { he } from '@/lib/i18n/he';
import { slugify, cn } from '@/lib/utils';
import { toast } from '@/lib/stores/toast';
import { createCompetition, updateCompetition } from '@/lib/actions/competitions';
import { competitionCreateSchema } from '@/lib/schemas';
import { useFormErrors } from '@/hooks/use-form-errors';

export type CompetitionFormInitial = {
  id?: string;
  name?: string;
  slug?: string;
  type?: 'league' | 'cup' | 'friendly';
  status?: 'draft' | 'active' | 'finished' | 'archived';
  format?: '5v5' | '6v6' | '7v7' | '8v8' | '9v9' | '10v10' | '11v11';
  season?: string | null;
  starts_on?: string | null;
  ends_on?: string | null;
  points_win?: number;
  points_draw?: number;
  points_loss?: number;
  rounds?: number;
  has_group_stage?: boolean;
  days_between_rounds?: number;
  default_match_time?: string;
};

export function CompetitionForm({ initial }: { initial?: CompetitionFormInitial }) {
  const router = useRouter();
  const editing = !!initial?.id;
  const [submitting, setSubmitting] = useState(false);
  const { errors, validate, clear } = useFormErrors();
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    slug: initial?.slug ?? '',
    type: (initial?.type ?? 'league') as 'league' | 'cup' | 'friendly',
    status: (initial?.status ?? 'active') as 'draft' | 'active' | 'finished' | 'archived',
    format: (initial?.format ?? '11v11') as any,
    season: initial?.season ?? new Date().getFullYear().toString(),
    starts_on: initial?.starts_on ?? '',
    ends_on: initial?.ends_on ?? '',
    points_win: initial?.points_win ?? 3,
    points_draw: initial?.points_draw ?? 1,
    points_loss: initial?.points_loss ?? 0,
    rounds: initial?.rounds ?? 1,
    has_group_stage: initial?.has_group_stage ?? false,
    days_between_rounds: initial?.days_between_rounds ?? 7,
    default_match_time: initial?.default_match_time ?? '18:00',
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    // Empty date strings must become undefined — Postgres `date` can't parse ''.
    const payload = {
      ...form,
      slug: form.slug || slugify(form.name),
      starts_on: form.starts_on || undefined,
      ends_on: form.ends_on || undefined,
      season: form.season || undefined,
    };
    const parsed = validate(competitionCreateSchema, payload);
    if (!parsed) { toast.error('יש לתקן את השדות המסומנים'); return; }
    setSubmitting(true);
    try {
      if (editing) {
        await updateCompetition(initial!.id!, parsed);
        toast.success('התחרות עודכנה');
        router.push(`/competitions/${initial!.id}`);
      } else {
        const data = await createCompetition(parsed);
        toast.success('התחרות נוצרה');
        router.push(`/competitions/${data.id}`);
      }
    } catch (err: any) {
      toast.error(err.message ?? 'הפעולה נכשלה');
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <Card>
        <CardHeader><CardTitle>{editing ? `${he.common.edit} — ${initial?.name}` : he.competition.create}</CardTitle></CardHeader>
        <CardBody>
          <form className="space-y-4" onSubmit={submit} noValidate>
            <Input label={he.competition.name} value={form.name} onChange={e => { clear('name'); setForm(f => ({ ...f, name: e.target.value, slug: editing ? f.slug : (f.slug || slugify(e.target.value)) })); }} placeholder="לדוגמה: ליגת השכונה 2026" error={errors.name} />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Select label={he.competition.type} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))} disabled={editing}>
                <option value="league">{he.competition.types.league}</option>
                <option value="cup">{he.competition.types.cup}</option>
                <option value="friendly">{he.competition.types.friendly}</option>
              </Select>
              {editing && (
                <Select label="סטטוס" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}>
                  <option value="draft">טיוטה</option>
                  <option value="active">פעילה</option>
                  <option value="finished">הסתיימה</option>
                  <option value="archived">בארכיון</option>
                </Select>
              )}
              <Input label={he.competition.season} value={form.season ?? ''} onChange={e => { clear('season'); setForm(f => ({ ...f, season: e.target.value })); }} placeholder={new Date().getFullYear().toString()} error={errors.season} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input type="date" label={he.competition.startsOn} value={form.starts_on ?? ''} onChange={e => { clear('starts_on'); setForm(f => ({ ...f, starts_on: e.target.value })); }} error={errors.starts_on} />
              <Input type="date" label={he.competition.endsOn} value={form.ends_on ?? ''} onChange={e => { clear('ends_on'); setForm(f => ({ ...f, ends_on: e.target.value })); }} error={errors.ends_on} />
            </div>

            {/* Scheduling defaults — used when fixtures are generated */}
            <div className="grid sm:grid-cols-2 gap-4">
              <Input type="time" label="שעת משחק קבועה" value={form.default_match_time} onChange={e => { clear('default_match_time'); setForm(f => ({ ...f, default_match_time: e.target.value })); }} error={errors.default_match_time} hint="כל המשחקים שייווצרו אוטומטית" />
              <Input type="number" label="ימים בין מחזורים" value={form.days_between_rounds} onChange={e => { clear('days_between_rounds'); setForm(f => ({ ...f, days_between_rounds: +e.target.value || 7 })); }} error={errors.days_between_rounds} hint="7 = מחזור כל שבוע" />
            </div>
            {form.type === 'league' && (
              <div className="space-y-4">
                {/* Scoring */}
                <div className="grid sm:grid-cols-3 gap-4">
                  <Input type="number" label={he.competition.pointsWin} value={form.points_win} onChange={e => { clear('points_win'); setForm(f => ({ ...f, points_win: +e.target.value })); }} hint="0–10" error={errors.points_win} />
                  <Input type="number" label={he.competition.pointsDraw} value={form.points_draw} onChange={e => { clear('points_draw'); setForm(f => ({ ...f, points_draw: +e.target.value })); }} hint="0–10" error={errors.points_draw} />
                  <Input type="number" label={he.competition.pointsLoss} value={form.points_loss} onChange={e => { clear('points_loss'); setForm(f => ({ ...f, points_loss: +e.target.value })); }} hint="0–10" error={errors.points_loss} />
                </div>

                {/* Rounds (radio cards) — clear meaning per option */}
                <div>
                  <label className="block mb-2 text-sm font-medium text-ink-800 dark:text-ink-200">{he.competition.rounds}</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {([
                      { v: 1, title: 'סיבוב יחיד', desc: 'כל זוג נפגש פעם' },
                      { v: 2, title: 'סיבוב כפול', desc: 'בית + חוץ' },
                      { v: 3, title: '3 סיבובים', desc: 'הקבוצות נפגשות 3 פעמים' },
                      { v: 4, title: '4 סיבובים', desc: 'הקבוצות נפגשות 4 פעמים' },
                    ] as const).map(opt => (
                      <button
                        key={opt.v}
                        type="button"
                        onClick={() => { clear('rounds'); setForm(f => ({ ...f, rounds: opt.v })); }}
                        className={cn(
                          'rounded-xl border-2 p-3 text-start transition-colors',
                          form.rounds === opt.v
                            ? 'border-pitch-500 bg-pitch-50 dark:bg-pitch-950 dark:border-pitch-400'
                            : 'border-ink-100 hover:border-ink-300 dark:border-ink-700 dark:hover:border-ink-500',
                        )}
                      >
                        <div className="font-display font-semibold text-ink-900 dark:text-ink-50">{opt.title}</div>
                        <div className="text-xs text-ink-500 dark:text-ink-400 mt-0.5">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                  {errors.rounds && <p className="mt-1 text-xs text-red-600">{errors.rounds}</p>}
                </div>
              </div>
            )}
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

export function NewCompetitionForm() { return <CompetitionForm />; }
