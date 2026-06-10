'use client';

import { useState } from 'react';
import { Copy, Check, MessageCircle, QrCode, X, Mail, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Show every channel an admin can use to deliver an invitation:
 *   • Status chip — '✓ נשלח אוטומטית' when Resend delivered, otherwise
 *     a mailto button as a manual fallback
 *   • Copy the raw link
 *   • Open WhatsApp with a pre-filled message
 *   • Display a QR code (rendered by api.qrserver.com — no deps)
 *
 * The mailto button only appears when emailSent=false — once the
 * server confirms Resend handled it, the manual button just confuses
 * the admin ("do I still need to click this?").
 */
export function InvitationShare({
  token,
  email,
  contextLabel,
  emailSent = false,
  onClose,
}: {
  token: string;
  email?: string | null;
  contextLabel?: string; // e.g. 'מנהל קבוצה — קבוצה אדומה'
  emailSent?: boolean;
  onClose?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  // origin: in SSR we don't have window — fall back to NEXT_PUBLIC_SITE_URL.
  const origin = typeof window !== 'undefined'
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_SITE_URL ?? '');
  const inviteUrl = `${origin}/invitations/accept?token=${token}`;

  const waText = encodeURIComponent(
    `שלום! הוזמנת ל-HaMigrash${contextLabel ? ` בתפקיד ${contextLabel}` : ''}.
לחץ על הקישור כדי לאשר:
${inviteUrl}`,
  );
  const waUrl = `https://wa.me/?text=${waText}`;

  const mailSubject = encodeURIComponent('הזמנה ל-HaMigrash');
  const mailBody = encodeURIComponent(
    `שלום! הוזמנת ל-HaMigrash${contextLabel ? ` בתפקיד ${contextLabel}` : ''}.\n\nקישור לאישור:\n${inviteUrl}`,
  );
  const mailUrl = email
    ? `mailto:${email}?subject=${mailSubject}&body=${mailBody}`
    : `mailto:?subject=${mailSubject}&body=${mailBody}`;

  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(inviteUrl)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <div className="rounded-xl2 bg-white dark:bg-ink-800 ring-1 ring-pitch-200 dark:ring-pitch-800 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display font-semibold text-ink-900 dark:text-ink-50">ההזמנה מוכנה לשליחה</h3>
          {contextLabel && <p className="text-xs text-ink-500 dark:text-ink-400 mt-0.5">{contextLabel}</p>}
        </div>
        {onClose && (
          <button onClick={onClose} className="size-8 rounded-lg grid place-items-center text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-700" aria-label="סגירה">
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Link with copy */}
      <div className="flex items-stretch gap-2">
        <input
          readOnly
          value={inviteUrl}
          dir="ltr"
          onFocus={e => e.target.select()}
          className="flex-1 min-w-0 h-10 rounded-xl bg-ink-50 dark:bg-ink-900 ring-1 ring-ink-200 dark:ring-ink-700 px-3 text-xs text-ink-700 dark:text-ink-200 font-mono"
        />
        <Button onClick={copy} variant="secondary" size="sm" className="gap-1.5 whitespace-nowrap">
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? 'הועתק' : 'העתק'}
        </Button>
      </div>

      {/* Status / channel row */}
      {emailSent && email ? (
        <div className="rounded-xl bg-pitch-50 dark:bg-pitch-950/40 ring-1 ring-pitch-200 dark:ring-pitch-800 px-4 py-3 flex items-center gap-3">
          <MailCheck className="size-5 text-pitch-700 dark:text-pitch-400 shrink-0" />
          <div className="text-sm leading-tight">
            <div className="font-medium text-pitch-900 dark:text-pitch-100">המייל נשלח אוטומטית</div>
            <div className="text-xs text-pitch-700 dark:text-pitch-300" dir="ltr">{email}</div>
          </div>
        </div>
      ) : null}

      <div className={emailSent ? '' : 'grid grid-cols-2 gap-2'}>
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`h-12 rounded-xl bg-[#25D366] text-white inline-flex items-center justify-center gap-2 font-medium hover:bg-[#1ebe57] transition-colors ${emailSent ? 'w-full' : ''}`}
        >
          <MessageCircle className="size-5" />
          {emailSent ? 'שלח גם ב-WhatsApp' : 'שלח ב-WhatsApp'}
        </a>
        {!emailSent && (
          <a
            href={mailUrl}
            className="h-12 rounded-xl bg-white dark:bg-ink-700 ring-1 ring-ink-200 dark:ring-ink-600 text-ink-800 dark:text-ink-100 inline-flex items-center justify-center gap-2 font-medium hover:bg-ink-50 dark:hover:bg-ink-800 transition-colors"
          >
            <Mail className="size-5" />
            שלח באימייל
          </a>
        )}
      </div>

      {/* QR code */}
      <details className="rounded-xl bg-ink-50 dark:bg-ink-900 ring-1 ring-ink-100 dark:ring-ink-700 px-3 py-2">
        <summary className="cursor-pointer text-sm text-ink-700 dark:text-ink-200 inline-flex items-center gap-2">
          <QrCode className="size-4" />
          הצג קוד QR לסריקה
        </summary>
        <div className="mt-3 grid place-items-center pb-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrSrc}
            alt="קוד QR להזמנה"
            width={240}
            height={240}
            className="rounded-lg bg-white p-2"
          />
        </div>
        <p className="text-[11px] text-ink-500 dark:text-ink-400 text-center pb-1">סריקה במצלמת הטלפון תפתח את הקישור ישירות</p>
      </details>

      <p className="text-[11px] text-ink-500 dark:text-ink-400">
        הקישור תקף 14 ימים. אפשר לסגור את החלון הזה ולהיכנס בכל רגע לרשימת ההזמנות.
      </p>
    </div>
  );
}
