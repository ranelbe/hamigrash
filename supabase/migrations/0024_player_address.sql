-- ============================================================
-- 0024: Player address (city + street) — populated from data.gov.il
-- ============================================================

alter table public.players
  add column if not exists address_city   text,
  add column if not exists address_street text;

-- House number is intentionally omitted — data.gov.il provides city +
-- street only. We keep it as free text rather than FK so a player keeps
-- their address even if data.gov.il renames a street later.

notify pgrst, 'reload schema';
