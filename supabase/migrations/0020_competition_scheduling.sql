-- ============================================================
-- HaMigrash — 0020: scheduling defaults on competitions
--   days_between_rounds   — gap between matchdays for fixture gen
--   default_match_time    — HH:MM combined with matchday date
-- ============================================================

alter table public.competitions
  add column if not exists days_between_rounds smallint not null default 7 check (days_between_rounds between 1 and 30),
  add column if not exists default_match_time  text     not null default '18:00';
