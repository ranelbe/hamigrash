import { notFound, redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getIsAppAdmin } from '@/lib/auth/app-admin';
import { CompetitionForm } from '../../new/_form';

export const dynamic = 'force-dynamic';

export default async function EditCompetitionPage({ params }: { params: { id: string } }) {
  const supabase = getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: comp } = await supabase.from('competitions').select('*').eq('id', params.id).single();
  if (!comp) notFound();

  const [isAdmin, { data: cm }] = await Promise.all([
    getIsAppAdmin(),
    supabase.from('competition_members').select('role').eq('competition_id', comp.id).eq('user_id', user.id).maybeSingle(),
  ]);
  const canEdit = isAdmin || ['organiser', 'admin'].includes((cm as any)?.role ?? '');
  if (!canEdit) redirect(`/competitions/${comp.id}`);

  return <CompetitionForm initial={comp} />;
}
