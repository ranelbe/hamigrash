-- ============================================================
-- HaMigrash — 0012: enable realtime publications
-- ============================================================

-- Replicate row changes for live match pages and dashboards.
alter publication supabase_realtime add table public.match_events;
alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.match_lineups;
