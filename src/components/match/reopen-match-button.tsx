'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/stores/toast';
import { reopenMatch } from '@/lib/actions/matches';

/**
 * 'תיקון תוצאה' — opens a finished match for re-scoring. Marks every
 * event as cancelled (preserved for audit) and flips the match back to
 * 'scheduled' so the RetroScoreForm becomes available again.
 */
export function ReopenMatchButton({ matchId }: { matchId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function go() {
    if (!confirm('לפתוח את המשחק לתיקון תוצאה? כל האירועים הקיימים יבוטלו (נשמרים לתיעוד) והניקוד יתאפס.')) return;
    start(async () => {
      try {
        await reopenMatch(matchId);
        toast.success('המשחק נפתח — אפשר להזין תוצאה חדשה');
        router.refresh();
      } catch (e: any) {
        toast.error(e?.message ?? 'הפעולה נכשלה');
      }
    });
  }

  return (
    <Button onClick={go} loading={pending} variant="secondary" size="sm" className="gap-2">
      <RotateCcw className="size-4" />
      תיקון תוצאה
    </Button>
  );
}
