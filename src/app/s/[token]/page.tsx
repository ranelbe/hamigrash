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

  if (link.competition?.slug) redirect(`/c/${link.competition.slug}`);
  if (link.team?.slug) redirect(`/t/${link.team.slug}`);
  if (link.match_id) redirect(`/m/${link.match_id}`);
  if (link.player_id) redirect(`/p/${link.player_id}`);
  notFound();
}
