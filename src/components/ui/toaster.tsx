'use client';

import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useToasts, type ToastKind } from '@/lib/stores/toast';
import { cn } from '@/lib/utils';

const TONE: Record<ToastKind, { wrap: string; icon: React.ReactNode }> = {
  success: { wrap: 'bg-emerald-50 ring-emerald-200 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100 dark:ring-emerald-800', icon: <CheckCircle2 className="size-5 text-emerald-600" /> },
  error:   { wrap: 'bg-red-50 ring-red-200 text-red-900 dark:bg-red-950 dark:text-red-100 dark:ring-red-800', icon: <AlertCircle className="size-5 text-red-600" /> },
  info:    { wrap: 'bg-sky-50 ring-sky-200 text-sky-900 dark:bg-sky-950 dark:text-sky-100 dark:ring-sky-800', icon: <Info className="size-5 text-sky-600" /> },
};

export function Toaster() {
  const items = useToasts(s => s.items);
  const dismiss = useToasts(s => s.dismiss);
  return (
    <div className="pointer-events-none fixed bottom-4 inset-x-4 z-[100] flex flex-col items-center gap-2">
      {items.map(t => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-auto max-w-md w-full shadow-cardLg ring-1 rounded-xl2 px-4 py-3 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2',
            TONE[t.kind].wrap,
          )}
          role={t.kind === 'error' ? 'alert' : 'status'}
        >
          {TONE[t.kind].icon}
          <p className="flex-1 text-sm font-medium">{t.message}</p>
          <button onClick={() => dismiss(t.id)} className="size-6 grid place-items-center rounded-md hover:bg-black/5">
            <X className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
