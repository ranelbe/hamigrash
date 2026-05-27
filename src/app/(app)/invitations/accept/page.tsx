'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { he } from '@/lib/i18n/he';
import { acceptInvitationByToken } from '@/lib/actions/invitations';

export default function AcceptInvitationPage() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token');
  const [state, setState] = useState<'idle' | 'working' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setState('error'); setError('missing_token'); return; }
    setState('working');
    acceptInvitationByToken(token)
      .then(() => { setState('done'); setTimeout(() => router.push('/dashboard'), 800); })
      .catch(e => { setState('error'); setError(prettify(e.message)); });
  }, [token, router]);

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardHeader><CardTitle>{he.invitation.accept}</CardTitle></CardHeader>
        <CardBody>
          {state === 'working' && <p className="text-sm text-ink-600 dark:text-ink-300">{he.common.loading}</p>}
          {state === 'done' && <p className="text-sm text-emerald-600">ההזמנה התקבלה. מעביר ללוח הבקרה…</p>}
          {state === 'error' && (
            <div className="space-y-3">
              <p className="text-sm text-red-600">{error}</p>
              <Button onClick={() => router.push('/dashboard')}>חזרה ללוח</Button>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function prettify(msg: string) {
  if (msg.includes('invitation_email_mismatch')) return he.invitation.emailMismatch;
  if (msg.includes('invitation_expired')) return he.invitation.expiredText;
  if (msg.includes('invitation_not_found')) return 'ההזמנה לא נמצאה.';
  return msg;
}
