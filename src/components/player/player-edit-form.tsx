'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { he } from '@/lib/i18n/he';
import { toast } from '@/lib/stores/toast';
import { updatePlayer } from '@/lib/actions/players';
import { playerCreateSchema } from '@/lib/schemas';
import { useFormErrors } from '@/hooks/use-form-errors';
import type { Player } from '@/lib/supabase/database.types';

// Convert "" → null, anything else → Number.
const num = (v: string | number) => v === '' || v === null || v === undefined ? null : +v;

export function PlayerEditForm({ player, trainingGroups }: { player: Player; trainingGroups: { id: string; name: string }[] }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const { errors, validate, clear } = useFormErrors();
  const [f, setF] = useState({
    display_name: player.display_name,
    squad_number: player.squad_number ?? '',
    position: player.position,
    photo_url: player.photo_url ?? '',
    training_group_id: player.training_group_id ?? '',
    rating_pace:       player.rating_pace ?? '',
    rating_shooting:   player.rating_shooting ?? '',
    rating_passing:    player.rating_passing ?? '',
    rating_dribbling:  player.rating_dribbling ?? '',
    rating_defending:  player.rating_defending ?? '',
    rating_physical:   player.rating_physical ?? '',
    rating_gk_diving:       player.rating_gk_diving ?? '',
    rating_gk_handling:     player.rating_gk_handling ?? '',
    rating_gk_kicking:      player.rating_gk_kicking ?? '',
    rating_gk_reflexes:     player.rating_gk_reflexes ?? '',
    rating_gk_speed:        player.rating_gk_speed ?? '',
    rating_gk_positioning:  player.rating_gk_positioning ?? '',
  });

  function set(key: keyof typeof f, value: string) {
    setF(s => ({ ...s, [key]: value }));
    clear(key as string);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      team_id: player.team_id, // required by schema; ignored on update
      display_name: f.display_name.trim(),
      squad_number: num(f.squad_number),
      position: f.position,
      photo_url: f.photo_url || undefined,
      training_group_id: f.training_group_id || null,
      rating_pace:       num(f.rating_pace),
      rating_shooting:   num(f.rating_shooting),
      rating_passing:    num(f.rating_passing),
      rating_dribbling:  num(f.rating_dribbling),
      rating_defending:  num(f.rating_defending),
      rating_physical:   num(f.rating_physical),
      rating_gk_diving:       num(f.rating_gk_diving),
      rating_gk_handling:     num(f.rating_gk_handling),
      rating_gk_kicking:      num(f.rating_gk_kicking),
      rating_gk_reflexes:     num(f.rating_gk_reflexes),
      rating_gk_speed:        num(f.rating_gk_speed),
      rating_gk_positioning:  num(f.rating_gk_positioning),
    };
    const parsed = validate(playerCreateSchema, payload);
    if (!parsed) { toast.error('יש לתקן את השדות המסומנים'); return; }
    setSubmitting(true);
    try {
      await updatePlayer(player.id, parsed);
      toast.success('השחקן עודכן');
      router.push(`/players/${player.id}`);
    } catch (e: any) {
      toast.error(e.message ?? 'עדכון נכשל');
      setSubmitting(false);
    }
  }

  const isGK = f.position === 'GK';
  const ratingRow = (key: keyof typeof f, label: string) => (
    <Input
      key={key}
      type="number"
      label={label}
      value={f[key] as any}
      onChange={e => set(key, e.target.value)}
      hint="0–100"
      error={errors[key as string]}
    />
  );

  return (
    <Card>
      <CardHeader><CardTitle>{he.common.edit} — {player.display_name}</CardTitle></CardHeader>
      <CardBody>
        <form className="space-y-5" onSubmit={submit} noValidate>
          <div className="grid sm:grid-cols-3 gap-4">
            <Input
              label={he.player.name}
              value={f.display_name}
              onChange={e => set('display_name', e.target.value)}
              error={errors.display_name}
              placeholder="לדוגמה: לאו מסי"
            />
            <Input
              type="number"
              label={he.player.squadNumber}
              value={f.squad_number}
              onChange={e => set('squad_number', e.target.value)}
              hint="1–99"
              error={errors.squad_number}
            />
            <Select label={he.player.position} value={f.position} onChange={e => set('position', e.target.value as any)}>
              {(['GK','DF','MF','FW'] as const).map(p => <option key={p} value={p}>{he.player.positions[p]}</option>)}
            </Select>
          </div>

          <div>
            <Select
              label="קבוצת אימון"
              value={f.training_group_id}
              onChange={e => set('training_group_id', e.target.value)}
              hint="שחקנים מאותה קבוצת אימון ישאפו להיות באותה קבוצה במאזן"
              error={errors.training_group_id}
            >
              <option value="">— ללא קבוצה —</option>
              {trainingGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </Select>
            {trainingGroups.length === 0 && (
              <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
                <a href="/training-groups" className="underline text-pitch-700 dark:text-pitch-400">להוספת קבוצות אימון</a>
              </p>
            )}
          </div>

          <div>
            <h4 className="text-sm font-semibold text-ink-800 dark:text-ink-200 mb-1">{he.player.ratings}</h4>
            <p className="text-xs text-ink-500 dark:text-ink-400 mb-3">כל ציון בין 0 ל־100. ניתן להשאיר ריק.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {isGK ? (
                <>
                  {ratingRow('rating_gk_diving',      he.player.gkDiving)}
                  {ratingRow('rating_gk_handling',    he.player.gkHandling)}
                  {ratingRow('rating_gk_kicking',     he.player.gkKicking)}
                  {ratingRow('rating_gk_reflexes',    he.player.gkReflexes)}
                  {ratingRow('rating_gk_speed',       he.player.gkSpeed)}
                  {ratingRow('rating_gk_positioning', he.player.gkPositioning)}
                </>
              ) : (
                <>
                  {ratingRow('rating_pace',      he.player.pace)}
                  {ratingRow('rating_shooting',  he.player.shooting)}
                  {ratingRow('rating_passing',   he.player.passing)}
                  {ratingRow('rating_dribbling', he.player.dribbling)}
                  {ratingRow('rating_defending', he.player.defending)}
                  {ratingRow('rating_physical',  he.player.physical)}
                </>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" loading={submitting}>{he.common.save}</Button>
            <Button variant="ghost" type="button" onClick={() => router.back()}>{he.common.cancel}</Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
