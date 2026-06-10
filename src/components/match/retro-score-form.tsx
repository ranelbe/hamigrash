'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { he } from '@/lib/i18n/he';
import { toast } from '@/lib/stores/toast';
import { enterFinalScore } from '@/lib/actions/matches';

export function RetroScoreForm({ matchId, isCup = false }: { matchId: string; isCup?: boolean }) {
  const router = useRouter();
  const [home, setHome] = useState<string>('0');
  const [away, setAway] = useState<string>('0');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // For cup matches, a tie isn't a valid final result — block submit
  // client-side so the user gets feedback the instant they see the tie.
  const isTie = home !== '' && away !== '' && Number(home) === Number(away);
  const blockedTie = isCup && isTie;

  function validate(): { home: number; away: number } | null {
    const next: Record<string, string> = {};
    const h = Number(home);
    const a = Number(away);
    if (home === '' || !Number.isInteger(h)) next.home = 'מספר שלם נדרש';
    else if (h < 0) next.home = 'אסור מספר שלילי';
    else if (h > 50) next.home = 'מקסימום 50';
    if (away === '' || !Number.isInteger(a)) next.away = 'מספר שלם נדרש';
    else if (a < 0) next.away = 'אסור מספר שלילי';
    else if (a > 50) next.away = 'מקסימום 50';
    setErrors(next);
    if (Object.keys(next).length > 0) return null;
    return { home: h, away: a };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = validate();
    if (!v) { toast.error('יש לתקן את השדות המסומנים'); return; }
    setSubmitting(true);
    try {
      await enterFinalScore(matchId, v.home, v.away);
      toast.success('התוצאה נשמרה');
      router.refresh();
    } catch (e: any) {
      toast.error(e.message ?? 'שמירה נכשלה');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>{he.match.enterResult}</CardTitle></CardHeader>
      <CardBody>
        <p className="text-sm text-ink-500 dark:text-ink-400 mb-4">
          הזנה רטרואקטיבית — שערים נרשמים כאירועים אנונימיים. ניתן יהיה להוסיף פרטי שחקנים לאחר מכן.
          {isCup && <span className="block mt-1 text-amber-700 dark:text-amber-300">משחק גביע — חייב להסתיים עם מנצח (לא תיקו).</span>}
        </p>
        <form className="flex flex-wrap items-start gap-3" onSubmit={submit} noValidate>
          <Input
            type="number"
            label={he.match.home}
            value={home}
            onChange={e => { setHome(e.target.value); setErrors(s => ({ ...s, home: '' })); }}
            className="w-28"
            hint="0–50"
            error={errors.home || undefined}
          />
          <span className="text-2xl pb-9 self-center">-</span>
          <Input
            type="number"
            label={he.match.away}
            value={away}
            onChange={e => { setAway(e.target.value); setErrors(s => ({ ...s, away: '' })); }}
            className="w-28"
            hint="0–50"
            error={errors.away || undefined}
          />
          <div className="pt-7">
            <Button type="submit" loading={submitting} disabled={blockedTie}>{he.common.save}</Button>
          </div>
        </form>
        {blockedTie && (
          <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">
            במשחק גביע אסור תיקו — שנה את אחת התוצאות כדי שיהיה מנצח.
          </p>
        )}
      </CardBody>
    </Card>
  );
}
