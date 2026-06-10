'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { he } from '@/lib/i18n/he';
import { toast } from '@/lib/stores/toast';
import { createInvitation } from '@/lib/actions/invitations';
import { invitationCreateSchema } from '@/lib/schemas';
import { useFormErrors } from '@/hooks/use-form-errors';
import { InvitationShare } from '@/components/invitations/invitation-share';

type Props = {
  teams: { id: string; name: string }[];
  competitions: { id: string; name: string }[];
  defaultTeam?: string;
  defaultCompetition?: string;
};

// Two invitation kinds only: team-manager OR competition-organiser.
// Each kind is only available if the user actually manages something of that type.
export function NewInvitationForm({ teams, competitions, defaultTeam, defaultCompetition }: Props) {
  const router = useRouter();

  // Allowed kinds based on what the user can administer.
  const canInviteTeam = teams.length > 0;
  const canInviteComp = competitions.length > 0;
  const initialKind: 'team' | 'competition' =
    defaultCompetition ? 'competition'
    : defaultTeam      ? 'team'
    : canInviteTeam    ? 'team'
                       : 'competition';

  const [kind, setKind] = useState<'team' | 'competition'>(initialKind);
  const [email, setEmail] = useState('');
  const [teamId, setTeamId] = useState(defaultTeam ?? teams[0]?.id ?? '');
  const [compId, setCompId] = useState(defaultCompetition ?? competitions[0]?.id ?? '');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { errors, validate, clear } = useFormErrors();
  // Just-created invitation — drives the share UI (link / WhatsApp / QR).
  // Cleared when the user starts entering a new invitation.
  const [shareInvite, setShareInvite] = useState<{ token: string; email: string | null; context: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      email,
      kind,
      message: message || undefined,
      team_id: kind === 'team' ? teamId : undefined,
      team_role: kind === 'team' ? 'manager' as const : undefined,
      competition_id: kind === 'competition' ? compId : undefined,
      competition_role: kind === 'competition' ? 'organiser' as const : undefined,
    };
    const parsed = validate(invitationCreateSchema, payload);
    if (!parsed) { toast.error('יש לתקן את השדות המסומנים'); return; }
    setSubmitting(true);
    try {
      const created = await createInvitation(parsed as any);
      toast.success('ההזמנה נוצרה');
      // Build a label so the share card knows what context this is.
      const context = kind === 'team'
        ? `מנהל קבוצה — ${teams.find(t => t.id === teamId)?.name ?? ''}`
        : `מארגן תחרות — ${competitions.find(c => c.id === compId)?.name ?? ''}`;
      setShareInvite({ token: (created as any).token, email: email || null, context });
      setEmail(''); setMessage('');
      router.refresh();
    } catch (e: any) {
      toast.error(e.message ?? 'יצירה נכשלה');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Share card for the just-created invitation */}
      {shareInvite && (
        <InvitationShare
          token={shareInvite.token}
          email={shareInvite.email}
          contextLabel={shareInvite.context}
          onClose={() => setShareInvite(null)}
        />
      )}

    <Card>
      <CardHeader>
        <CardTitle>{he.invitation.invite}</CardTitle>
        <p className="text-sm text-ink-500 dark:text-ink-400 mt-0.5">
          הזמנה רק לתפקידי ניהול. צופים יכולים להיכנס ללא הזמנה.
          אחרי יצירה אפשר לשלוח בקישור, WhatsApp או QR.
        </p>
      </CardHeader>
      <CardBody>
        <form className="grid sm:grid-cols-2 gap-4" onSubmit={submit} noValidate>
          {canInviteTeam && canInviteComp ? (
            <Select label="סוג ההזמנה" value={kind} onChange={e => setKind(e.target.value as any)}>
              <option value="team">מנהל קבוצה</option>
              <option value="competition">מארגן תחרות</option>
            </Select>
          ) : (
            <div>
              <label className="block mb-1.5 text-sm font-medium text-ink-800 dark:text-ink-200">סוג ההזמנה</label>
              <div className="h-11 px-3 rounded-xl border border-ink-200 dark:border-ink-700 bg-ink-50 dark:bg-ink-900 flex items-center text-sm text-ink-700 dark:text-ink-200">
                {kind === 'team' ? 'מנהל קבוצה' : 'מארגן תחרות'}
              </div>
            </div>
          )}

          <Input type="email" label={he.invitation.email} value={email} onChange={e => { setEmail(e.target.value); clear('email'); }} dir="ltr" placeholder="name@example.com" error={errors.email} />

          {kind === 'team' ? (
            <div className="sm:col-span-2">
              <Select label="קבוצה" value={teamId} onChange={e => { setTeamId(e.target.value); clear('team_id'); }} error={errors.team_id}>
                {teams.length === 0 ? <option value="" disabled>אין קבוצות לניהול</option> : teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </div>
          ) : (
            <div className="sm:col-span-2">
              <Select label="תחרות" value={compId} onChange={e => { setCompId(e.target.value); clear('competition_id'); }} error={errors.competition_id}>
                {competitions.length === 0 ? <option value="" disabled>אין תחרויות לניהול</option> : competitions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
          )}

          <div className="sm:col-span-2">
            <Input label={he.invitation.message} value={message} onChange={e => { setMessage(e.target.value); clear('message'); }} placeholder="לא חובה" error={errors.message} />
          </div>

          <div className="sm:col-span-2">
            <Button type="submit" loading={submitting} disabled={(kind === 'team' && !teamId) || (kind === 'competition' && !compId)}>
              {shareInvite ? 'יצירת הזמנה נוספת' : 'צור הזמנה'}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
    </div>
  );
}
