-- ============================================================
-- HaMigrash — 0019: ensure anon can call read-only RPC functions
-- so the public competition/share pages render for non-logged-in users.
-- ============================================================

grant execute on function public.competition_standings(uuid) to anon, authenticated;
grant execute on function public.head_to_head(uuid, uuid, uuid) to anon, authenticated;
grant execute on function public.player_stats(uuid, uuid) to anon, authenticated;
grant select on public.match_scores to anon, authenticated;
grant select on public.competition_top_scorers to anon, authenticated;
