'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/stores/toast';
import { generateNextCupRound } from '@/lib/actions/cup-progress';

const REASON_HE: Record<string, string> = {
  not_authenticated: 'יש להתחבר תחילה',
  not_authorized: 'רק admin / מארגן התחרות יכול ליצור את השלב הבא',
  competition_not_found: 'התחרות לא נמצאה',
  not_a_cup: 'הפעולה זמינה רק לתחרויות גביע',
  no_round_0: 'אין סיבוב פעיל ליצור ממנו את הבא',
  cup_already_finished: 'הגביע הסתיים — אין שלב הבא',
  next_round_already_exists: 'השלב הבא כבר קיים',
  current_round_not_finished: 'יש לסיים את כל המשחקים בשלב הנוכחי תחילה',
  tied_match_needs_decider: 'יש משחק שהסתיים בתיקו — צריך פתרון (פנדלים/הארכה) לפני המשך',
  too_few_teams_to_advance: 'אין מספיק קבוצות להמשך',
  no_pairs_for_next_round: 'לא ניתן לחבר זוגות לסיבוב הבא',
};

export function NextCupRoundButton({ competitionId }: { competitionId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  function go() {
    start(async () => {
      const res = await generateNextCupRound(competitionId);
      if (res.ok) {
        toast.success(`נוצרו ${res.created} משחקים — ${res.nextRoundLabel}`);
        router.refresh();
      } else {
        const msg = REASON_HE[res.reason] ?? `שגיאה: ${res.reason}`;
        toast.error(msg);
      }
    });
  }
  return (
    <Button onClick={go} loading={pending} variant="secondary" className="gap-2">
      <ArrowRight className="size-4" />
      צור משחקי שלב הבא
    </Button>
  );
}
