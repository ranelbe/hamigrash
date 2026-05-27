-- ============================================================
-- HaMigrash — 0015: player ratings 0..100 (was 0..99)
-- ============================================================

do $$
declare r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'public.players'::regclass
      and conname like 'players_rating_%_check'
  loop
    execute format('alter table public.players drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.players
  add constraint players_rating_pace_check       check (rating_pace       between 0 and 100),
  add constraint players_rating_shooting_check   check (rating_shooting   between 0 and 100),
  add constraint players_rating_passing_check    check (rating_passing    between 0 and 100),
  add constraint players_rating_dribbling_check  check (rating_dribbling  between 0 and 100),
  add constraint players_rating_defending_check  check (rating_defending  between 0 and 100),
  add constraint players_rating_physical_check   check (rating_physical   between 0 and 100),
  add constraint players_rating_gk_diving_check       check (rating_gk_diving       between 0 and 100),
  add constraint players_rating_gk_handling_check     check (rating_gk_handling     between 0 and 100),
  add constraint players_rating_gk_kicking_check      check (rating_gk_kicking      between 0 and 100),
  add constraint players_rating_gk_reflexes_check     check (rating_gk_reflexes     between 0 and 100),
  add constraint players_rating_gk_speed_check        check (rating_gk_speed        between 0 and 100),
  add constraint players_rating_gk_positioning_check  check (rating_gk_positioning  between 0 and 100);
