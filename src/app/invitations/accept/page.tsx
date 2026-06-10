import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { he } from '@/lib/i18n/he';

export const dynamic = 'force-dynamic';

/**
 * Invitation acceptance — PUBLIC route (intentionally not inside (app)).
 *
 * Old layout: (app)/invitations/accept lived behind the auth gate. The
 * gate redirected logged-out users to /login WITHOUT preserving the
 * token in the URL, so after Google sign-in they landed on /dashboard
 * and the invitation was lost.
 *
 * New flow:
 *   1. User clicks the link (logged in or not).
 *   2. If not logged in → render a 'sign in to accept' card with the
 *      token preserved as `next=/invitations/accept?token=…`.
 *   3. If logged in → call the accept_invitation RPC and redirect to
 *      /dashboard on success or show a Hebrew error card on failure.
 */
export default async function AcceptInvitationPage({
  searchParams,
}: { searchParams: { token?: string } }) {
  const token = searchParams.token?.trim();
  if (!token) return <ErrorCard msg="חסר טוקן בקישור — הקישור לא תקין" />;

  const supabase = getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Not logged in — bounce to /login with the next param so the OAuth
  // callback brings the user RIGHT BACK here, token intact.
  if (!user) {
    const nextUrl = `/invitations/accept?token=${encodeURIComponent(token)}`;
    return (
      <div className="min-h-screen grid place-items-center px-6 bg-gradient-to-b from-white to-pitch-50 dark:from-[#0b1220] dark:to-ink-900">
        <Card className="max-w-md w-full p-6 text-center">
          <CardHeader><CardTitle>{he.invitation.accept}</CardTitle></CardHeader>
          <CardBody className="space-y-4">
            <p className="text-sm text-ink-700 dark:text-ink-200">
              כדי לאשר את ההזמנה, היכנס עם חשבון Google (כל חשבון יתאים — אין צורך באימייל ספציפי).
            </p>
            <Link
              href={`/login?next=${encodeURIComponent(nextUrl)}`}
              className="inline-flex h-11 px-5 rounded-xl bg-pitch-600 text-white font-medium items-center gap-2 hover:bg-pitch-700"
            >
              המשך להתחברות
            </Link>
            <p className="text-[11px] text-ink-500 dark:text-ink-400">
              אחרי ההתחברות תחזור אוטומטית לכאן ותקבל את ההרשאה.
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  // Logged in — try to accept the token.
  const { error } = await supabase.rpc('accept_invitation' as any, { p_token: token });
  if (error) {
    return <ErrorCard msg={prettify(error.message)} />;
  }

  // Success → straight to the dashboard, the new role is already on the user.
  redirect('/dashboard');
}

function ErrorCard({ msg }: { msg: string }) {
  return (
    <div className="min-h-screen grid place-items-center px-6 bg-gradient-to-b from-white to-pitch-50 dark:from-[#0b1220] dark:to-ink-900">
      <Card className="max-w-md w-full p-6 text-center">
        <CardHeader><CardTitle>{he.invitation.accept}</CardTitle></CardHeader>
        <CardBody className="space-y-4">
          <p className="text-sm text-red-600 dark:text-red-300">{msg}</p>
          <Link
            href="/dashboard"
            className="inline-flex h-10 px-4 rounded-xl bg-white dark:bg-ink-800 ring-1 ring-ink-200 dark:ring-ink-700 text-ink-800 dark:text-ink-100 items-center"
          >
            חזרה ללוח הבקרה
          </Link>
        </CardBody>
      </Card>
    </div>
  );
}

function prettify(msg: string): string {
  if (msg.includes('invitation_not_found')) return 'ההזמנה לא נמצאה. ייתכן שהקישור שגוי או שההזמנה נמחקה.';
  if (msg.includes('invitation_expired')) return 'תוקף ההזמנה פג. בקש קישור חדש מהאדמין.';
  if (msg.includes('invitation_not_pending')) return 'ההזמנה כבר טופלה (אושרה / בוטלה).';
  if (msg.includes('not_authenticated')) return 'יש להתחבר תחילה.';
  return msg;
}
