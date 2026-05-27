'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { he } from '@/lib/i18n/he';
import { toast } from '@/lib/stores/toast';
import { createPlayer } from '@/lib/actions/players';
import { playerCreateSchema } from '@/lib/schemas';
import { useFormErrors } from '@/hooks/use-form-errors';

export function NewPlayerForm({ teams, trainingGroups, defaultTeam }: {
  teams: { id: string; name: string }[];
  trainingGroups: { id: string; name: string }[];
  defaultTeam?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { errors, validate, clear } = useFormErrors();
  const [form, setForm] = useState({ team_id: defaultTeam ?? teams[0]?.id ?? '', display_name: '', squad_number: '', position: 'MF' as const, training_group_id: '' });

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm(f => ({ ...f, [k]: v }));
    clear(k as string);
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>{he.player.create}</Button>;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      team_id: form.team_id,
      display_name: form.display_name.trim(),
      squad_number: form.squad_number ? +form.squad_number : null,
      position: form.position,
      training_group_id: form.training_group_id || null,
    };
    const parsed = validate(playerCreateSchema, payload);
    if (!parsed) { toast.error('יש לתקן את השדות המסומנים'); return; }
    setSubmitting(true);
    try {
      await createPlayer(parsed as any);
      toast.success('השחקן נוצר');
      setOpen(false);
      router.refresh();
    } catch (e: any) {
      toast.error(e.message ?? 'יצירה נכשלה');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>{he.player.create}</CardTitle></CardHeader>
      <CardBody>
        <form className="grid sm:grid-cols-4 gap-3 items-start" onSubmit={submit} noValidate>
          <Select label={he.nav.teams} value={form.team_id} onChange={e => set('team_id', e.target.value)} error={errors.team_id}>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
          <Input label={he.player.name} value={form.display_name} onChange={e => set('display_name', e.target.value)} placeholder="לדוגמה: לאו מסי" error={errors.display_name} />
          <Input type="number" label={he.player.squadNumber} value={form.squad_number} onChange={e => set('squad_number', e.target.value)} hint="1–99" error={errors.squad_number} />
          <Select label={he.player.position} value={form.position} onChange={e => set('position', e.target.value as any)} error={errors.position}>
            {(['GK','DF','MF','FW'] as const).map(p => <option key={p} value={p}>{he.player.positions[p]}</option>)}
          </Select>
          <div className="sm:col-span-4">
            <Select label="קבוצת אימון (אופציונלי)" value={form.training_group_id} onChange={e => set('training_group_id', e.target.value)} hint="שחקנים מאותה קבוצה ינסו להישאר יחד באיזון" error={errors.training_group_id}>
              <option value="">— ללא קבוצה —</option>
              {trainingGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </Select>
          </div>
          <div className="sm:col-span-4 flex gap-2 pt-2">
            <Button type="submit" loading={submitting}>{he.common.save}</Button>
            <Button variant="ghost" type="button" onClick={() => { setOpen(false); clear(); }}>{he.common.cancel}</Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
