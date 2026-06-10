'use client';

import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InvitationShare } from './invitation-share';

/**
 * Re-open the share UI for an existing pending invitation. Useful when
 * the original WhatsApp/email got lost — the admin can pull the link
 * + QR back up at any time.
 */
export function ReshareButton({ token, email, contextLabel }: {
  token: string;
  email: string | null;
  contextLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)} variant="ghost" size="sm" className="gap-1.5">
        <Share2 className="size-4" />
        שתף
      </Button>
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 dark:bg-black/70 grid place-items-center p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div onClick={e => e.stopPropagation()} className="w-full max-w-md">
            <InvitationShare
              token={token}
              email={email}
              contextLabel={contextLabel}
              onClose={() => setOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
