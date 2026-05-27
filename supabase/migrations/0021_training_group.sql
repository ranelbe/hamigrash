-- ============================================================
-- HaMigrash — 0021: training group on player
-- Free-text label (e.g. "קבוצת ראשון") that the balancer treats as
-- a soft constraint — players in the same group prefer to land on
-- the same team.
-- ============================================================

alter table public.players
  add column if not exists training_group text;

create index if not exists players_training_group_idx
  on public.players (training_group)
  where training_group is not null;
