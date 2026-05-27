import { notFound, redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getIsAppAdmin } from '@/lib/auth/app-admin';
import { TeamsManager } from './_manager';

export const dynamic = 'force-dynamic';

export default async function CompetitionTeamsPage({ params }: { params: { id: string } }) {
  const supabase = getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: comp } = await supabase.from('competitions').select('id, name').eq('id', params.id).single();
  if (!comp) notFound();

  const [isAdmin, { data: cm }] = await Promise.all([
    getIsAppAdmin(),
    supabase.from('competition_members').select('role').eq('competition_id', comp.id).eq('user_id', user.id).maybeSingle(),
  ]);
  const canManage = isAdmin || ['organiser', 'admin'].includes((cm as any)?.role ?? '');
  if (!canManage) redirect(`/competitions/${comp.id}`);

  const [{ data: enrolled }, { data: allTeams }] = await Promise.all([
    supabase.from('competition_teams')
      .select('team_id, group_label, seed, team:teams(id, name, primary_color, short_name, crest_shape, crest_text_color)')
      .eq('competition_id', comp.id),
    supabase.from('teams').select('id, name, primary_color, short_name, crest_shape, crest_text_color').order('name'),
  ]);

  // Supabase widens to-one joins as arrays — flatten the team object.
  const enrolledNormalized = ((enrolled ?? []) as any[]).map(e => ({
    ...e,
    team: Array.isArray(e.team) ? (e.team[0] ?? null) : (e.team ?? null),
  }));
  const enrolledIds = new Set(enrolledNormalized.map(e => e.team_id));
  const available = (allTeams ?? []).filter(t => !enrolledIds.has(t.id));

  return <TeamsManager competitionId={comp.id} competitionName={comp.name} enrolled={enrolledNormalized as any} available={available as any} />;
}
