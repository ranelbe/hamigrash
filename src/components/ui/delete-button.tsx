'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { he } from '@/lib/i18n/he';

type Props = {
  // Server action that performs the actual delete.
  action: () => Promise<void>;
  // Where to navigate after success.
  redirectTo?: string;
  // Confirmation text (e.g. "מחיקת קבוצה — בטוח?")
  confirm: string;
  label?: string;
  size?: 'sm' | 'md';
};

export function DeleteButton({ action, redirectTo, confirm, label = he.common.delete, size = 'md' }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  function run() {
    setErr(null);
    start(async () => {
      try {
        await action();
        if (redirectTo) router.push(redirectTo);
        else router.refresh();
      } catch (e: any) {
        setErr(e.message ?? String(e));
        setOpen(false);
      }
    });
  }

  return (
    <>
      <Button variant="danger" size={size} onClick={() => setOpen(true)} className="gap-2">
        <Trash2 className="size-4" />
        {label}
      </Button>
      {err && <p className="text-sm text-red-600 mt-2">{err}</p>}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/70 grid place-items-center p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="bg-white dark:bg-ink-800 rounded-xl2 p-6 max-w-md w-full shadow-cardLg ring-1 ring-ink-200 dark:ring-ink-700" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-lg font-semibold text-ink-900 dark:text-ink-50 mb-2">{he.common.confirm}</h3>
            <p className="text-sm text-ink-600 dark:text-ink-300 mb-5">{confirm}</p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>{he.common.cancel}</Button>
              <Button variant="danger" onClick={run} loading={pending}>{he.common.delete}</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
