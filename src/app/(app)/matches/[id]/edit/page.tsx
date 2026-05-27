import { notFound, redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { MatchForm } from '../../new/_form';

export const dynamic = 'force-dynamic';

export default async function EditMatchPage({ params }: { params: { id: string } }) {
  const supabase = getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: match } = await supabase.from('matches').select('*').eq('id', params.id).single();
  if (!match) notFound();

  // RLS handles authorisation on update; we do a soft check here for redirect.
  const { data: can } = await supabase.rpc('can_manage_match' as any, { p_match_id: match.id });
  if (can !== true) redirect(`/matches/${match.id}`);

  const [teamsRes, compsRes] = await Promise.all([
    supabase.from('teams').select('id, name').order('name'),
    supabase.from('competitions').select('id, name, format').order('name'),
  ]);
  return <MatchForm teams={teamsRes.data ?? []} competitions={compsRes.data ?? []} initial={match} />;
}
