import type { Invitation } from '@/lib/supabase/database.types';

const FROM = process.env.RESEND_FROM ?? 'HaMigrash <noreply@hamigrash.app>';
const RESEND_KEY = process.env.RESEND_API_KEY;
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

// Plug-in email sender. In dev (no RESEND_API_KEY) it just logs.
export async function sendInvitationEmail(invitation: Invitation) {
  const url = `${SITE}/invitations/accept?token=${invitation.token}`;
  const subject = subjectFor(invitation);
  const html = htmlBody(invitation, url);

  if (!RESEND_KEY) {
    console.info('[email:dev] to=%s subject=%s url=%s', invitation.email, subject, url);
    return;
  }

  // Charset=utf-8 in the Content-Type AND a UTF-8 meta tag in the HTML
  // are both required — without them Gmail/Outlook fall back to Latin1
  // and render Hebrew text as ???.
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_KEY}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({ from: FROM, to: invitation.email, subject, html }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`email_send_failed: ${res.status} ${text}`);
  }
}

function subjectFor(inv: Invitation) {
  if (inv.kind === 'team') return 'הוזמנת לקבוצה ב־הַמִּגְרָשׁ';
  if (inv.kind === 'competition') return 'הוזמנת לארגן תחרות ב־הַמִּגְרָשׁ';
  return 'הוזמנת לשפוט משחק ב־הַמִּגְרָשׁ';
}

function htmlBody(inv: Invitation, url: string) {
  // Explicit <meta charset="utf-8"> in <head> tells Gmail/Outlook to
  // decode the Hebrew text as UTF-8 and not as Latin1 (the SMTP default).
  return `<!doctype html>
<html dir="rtl" lang="he">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>הוזמנת ל-המגרש</title>
</head>
<body style="font-family:system-ui,Arial;padding:24px;background:#f8fafc;color:#0f172a;direction:rtl">
  <div style="max-width:520px;margin:0 auto;background:white;border-radius:16px;padding:32px;box-shadow:0 10px 30px -10px rgba(15,23,42,.18)">
    <h1 style="margin:0 0 12px;font-size:22px">הוזמנת לְ-הַמִּגְרָשׁ ⚽</h1>
    <p style="margin:0 0 16px;line-height:1.6">${inv.message ? escapeHtml(inv.message) : 'מארגן הזמין אותך להצטרף.'}</p>
    <a href="${url}" style="display:inline-block;background:#16a34a;color:white;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">קבלת ההזמנה</a>
    <p style="margin:24px 0 0;font-size:12px;color:#64748b">ההזמנה תקפה עד ${new Date(inv.expires_at).toLocaleDateString('he-IL')}.${inv.email ? ` המייל הוזמן הוא ${inv.email} (לא חובה — אפשר להיכנס עם כל חשבון Google).` : ''}</p>
  </div>
</body>
</html>`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
