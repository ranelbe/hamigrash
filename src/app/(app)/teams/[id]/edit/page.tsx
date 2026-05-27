import { notFound, redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getIsAppAdmin } from '@/lib/auth/app-admin';
import { TeamForm } from '../../new/_form';

export const dynamic = 'force-dynamic';

export default async function EditTeamPage({ params }: { params: { id: string } }) {
  const supabase = getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: team } = await supabase.from('teams').select('*').eq('id', params.id).single();
  if (!team) notFound();

  // Editing requires being a manager of THIS team (RLS uses the same rule).
  const [isAdmin, { data: tm }] = await Promise.all([
    getIsAppAdmin(),
    supabase.from('team_members').select('role').eq('team_id', team.id).eq('user_id', user.id).maybeSingle(),
  ]);
  const canEdit = isAdmin || ['manager', 'assistant'].includes((tm as any)?.role ?? '');
  if (!canEdit) redirect(`/teams/${team.id}`);

  return <TeamForm initial={team} />;
}
