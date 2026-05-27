import { notFound, redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';

// Resolve a share token to the canonical public URL.
export default async function ShareResolver({ params }: { params: { token: string } }) {
  const supabase = getSupabaseServerClient();
  const { data: link } = await supabase
    .from('share_links')
    .select('team_id, competition_id, match_id, player_id, team:teams(slug), competition:competitions(slug)')
    .eq('token', params.token)
    .single();
  if (!link) notFound();

  // Supabase widens to-one joins as arrays — normalise to single objects.
  const l = link as any;
  const team = Array.isArray(l.team) ? l.team[0] : l.team;
  const competition = Array.isArray(l.competition) ? l.competition[0] : l.competition;

  if (competition?.slug) redirect(`/c/${competition.slug}`);
  if (team?.slug) redirect(`/t/${team.slug}`);
  if (l.match_id) redirect(`/m/${l.match_id}`);
  if (l.player_id) redirect(`/p/${l.player_id}`);
  notFound();
}
