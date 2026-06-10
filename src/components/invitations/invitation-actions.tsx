'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { MoreVertical, Trash2, Ban, UserMinus, X } from 'lucide-react';
import { toast } from '@/lib/stores/toast';
import { revokeInvitation, deleteInvitation, revokeAcceptedAccess } from '@/lib/actions/invitations';

type Status = 'pending' | 'accepted' | 'revoked' | 'expired';

/**
 * Per-row dropdown of admin actions on an invitation. Surfaces only the
 * actions that actually apply to the row's current status:
 *
 *   pending  → 'בטל הזמנה' (mark revoked) + 'מחק'
 *   accepted → 'הסר הרשאה' (drop team_member/competition_member) + 'מחק'
 *   revoked  → 'מחק'
 *   expired  → 'מחק'
 *
 * Confirmations are inline (window.confirm) — the actions are
 * reversible only by re-inviting, so we don't want a one-click destruct.
 */
export function InvitationActions({ id, status }: { id: string; status: Status }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  function runAction(action: () => Promise<void>, successMsg: string, confirmMsg: string) {
    if (!confirm(confirmMsg)) return;
    setOpen(false);
    start(async () => {
      try {
        await action();
        toast.success(successMsg);
        router.refresh();
      } catch (e: any) {
        toast.error(e?.message ?? 'הפעולה נכשלה');
      }
    });
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={pending}
        aria-label="פעולות"
        className="size-8 rounded-lg grid place-items-center text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-700 disabled:opacity-40"
      >
        <MoreVertical className="size-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute end-0 mt-1 w-48 z-40 rounded-xl bg-white dark:bg-ink-800 ring-1 ring-ink-200 dark:ring-ink-700 shadow-cardLg p-1 text-sm">
            {status === 'pending' && (
              <button
                onClick={() => runAction(
                  () => revokeInvitation(id),
                  'ההזמנה בוטלה',
                  'לבטל את ההזמנה? לא תוכל להתקבל יותר.',
                )}
                className="w-full text-start px-3 py-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-700 inline-flex items-center gap-2"
              >
                <Ban className="size-4 text-amber-600" />
                בטל הזמנה
              </button>
            )}
            {status === 'accepted' && (
              <button
                onClick={() => runAction(
                  () => revokeAcceptedAccess(id),
                  'הרשאת המוזמן הוסרה',
                  'להסיר את ההרשאה שניתנה? המוזמן יוסר מהקבוצה/תחרות.',
                )}
                className="w-full text-start px-3 py-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-700 inline-flex items-center gap-2"
              >
                <UserMinus className="size-4 text-amber-600" />
                הסר הרשאה
              </button>
            )}
            <button
              onClick={() => runAction(
                () => deleteInvitation(id),
                'ההזמנה נמחקה',
                'למחוק את ההזמנה לצמיתות? פעולה זו אינה הפיכה.',
              )}
              className="w-full text-start px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-red-700 dark:text-red-300 inline-flex items-center gap-2"
            >
              <Trash2 className="size-4" />
              מחיקה מהרשימה
            </button>
            <button
              onClick={() => setOpen(false)}
              className="w-full text-start px-3 py-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-700 inline-flex items-center gap-2 text-ink-500"
            >
              <X className="size-4" />
              סגירה
            </button>
          </div>
        </>
      )}
    </div>
  );
}
