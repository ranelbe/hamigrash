'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { cancelMatchEvent } from '@/lib/actions/matches';

export function CancelEventButton({ eventId, matchId }: { eventId: string; matchId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => {
        if (!confirm('לבטל את האירוע?')) return;
        start(async () => { await cancelMatchEvent(eventId, matchId); router.refresh(); });
      }}
      disabled={pending}
      className="size-6 rounded-md text-ink-400 hover:text-red-600 hover:bg-red-50 grid place-items-center disabled:opacity-40"
      aria-label="ביטול אירוע"
    >
      <X className="size-3.5" />
    </button>
  );
}
