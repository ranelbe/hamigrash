-- ============================================================
-- HaMigrash — 0014: ON DELETE CASCADE for team-dependent rows
-- Deleting a team now also deletes its enrolments, matches,
-- lineups, etc. (Players, team_members already cascaded.)
-- ============================================================

alter table public.competition_teams
  drop constraint if exists competition_teams_team_id_fkey,
  add  constraint competition_teams_team_id_fkey
       foreign key (team_id) references public.teams(id) on delete cascade;

alter table public.matches
  drop constraint if exists matches_home_team_id_fkey,
  add  constraint matches_home_team_id_fkey
       foreign key (home_team_id) references public.teams(id) on delete cascade;

alter table public.matches
  drop constraint if exists matches_away_team_id_fkey,
  add  constraint matches_away_team_id_fkey
       foreign key (away_team_id) references public.teams(id) on delete cascade;

alter table public.match_lineups
  drop constraint if exists match_lineups_team_id_fkey,
  add  constraint match_lineups_team_id_fkey
       foreign key (team_id) references public.teams(id) on delete cascade;
