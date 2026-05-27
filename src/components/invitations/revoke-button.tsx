'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { revokeInvitation } from '@/lib/actions/invitations';

export function RevokeInvitationButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => {
        if (!confirm('לבטל את ההזמנה?')) return;
        start(async () => { await revokeInvitation(id); router.refresh(); });
      }}
      disabled={pending}
      className="text-xs text-red-600 hover:underline disabled:opacity-40"
    >
      ביטול
    </button>
  );
}
