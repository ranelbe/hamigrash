import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { canCreateMatch } from '@/lib/auth/capabilities';
import { NewMatchForm } from './_form';

export const dynamic = 'force-dynamic';

export default async function NewMatchPage() {
  if (!(await canCreateMatch())) redirect('/dashboard');
  const supabase = getSupabaseServerClient();
  const [teamsRes, compsRes] = await Promise.all([
    supabase.from('teams').select('id, name').order('name'),
    supabase.from('competitions').select('id, name, format').neq('status', 'archived').order('name'),
  ]);
  return <NewMatchForm teams={teamsRes.data ?? []} competitions={compsRes.data ?? []} />;
}
