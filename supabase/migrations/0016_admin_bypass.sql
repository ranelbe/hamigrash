-- ============================================================
-- HaMigrash — 0016: app_admin can perform any entity write
-- The original RLS policies only granted writes to entity-scoped
-- roles (team manager, competition organiser, match official).
-- We add `is_app_admin()` to every relevant policy so platform
-- admins can manage anything without being a member of each entity.
-- ============================================================

-- Helper: app admin OR is the row's manager / organiser / official.

-- teams: app_admin can update/delete any team
drop policy if exists teams_update on public.teams;
create policy teams_update on public.teams
  for update using (public.is_app_admin() or public.is_team_manager(id))
  with check (public.is_app_admin() or public.is_team_manager(id));

drop policy if exists teams_delete on public.teams;
create policy teams_delete on public.teams
  for delete using (public.is_app_admin() or created_by = auth.uid());

-- team_members
drop policy if exists team_members_insert on public.team_members;
create policy team_members_insert on public.team_members
  for insert with check (public.is_app_admin() or public.is_team_manager(team_id));

drop policy if exists team_members_update on public.team_members;
create policy team_members_update on public.team_members
  for update using (public.is_app_admin() or public.is_team_manager(team_id))
  with check (public.is_app_admin() or public.is_team_manager(team_id));

drop policy if exists team_members_delete on public.team_members;
create policy team_members_delete on public.team_members
  for delete using (public.is_app_admin() or public.is_team_manager(team_id) or user_id = auth.uid());

-- players
drop policy if exists players_write on public.players;
create policy players_write on public.players
  for all using (public.is_app_admin() or public.is_team_manager(team_id))
  with check (public.is_app_admin() or public.is_team_manager(team_id));

-- competitions
drop policy if exists competitions_update on public.competitions;
create policy competitions_update on public.competitions
  for update using (public.is_app_admin() or public.is_competition_organiser(id))
  with check (public.is_app_admin() or public.is_competition_organiser(id));

drop policy if exists competitions_delete on public.competitions;
create policy competitions_delete on public.competitions
  for delete using (public.is_app_admin() or created_by = auth.uid());

-- competition_teams
drop policy if exists competition_teams_write on public.competition_teams;
create policy competition_teams_write on public.competition_teams
  for all using (public.is_app_admin() or public.is_competition_organiser(competition_id))
  with check (public.is_app_admin() or public.is_competition_organiser(competition_id));

-- competition_members
drop policy if exists competition_members_write on public.competition_members;
create policy competition_members_write on public.competition_members
  for all using (public.is_app_admin() or public.is_competition_organiser(competition_id))
  with check (public.is_app_admin() or public.is_competition_organiser(competition_id));

-- matches
drop policy if exists matches_insert on public.matches;
create policy matches_insert on public.matches
  for insert with check (
    public.is_app_admin()
    or (competition_id is not null and public.is_competition_organiser(competition_id))
    or (competition_id is null and (
      public.is_team_manager(home_team_id) or public.is_team_manager(away_team_id)
    ))
  );

drop policy if exists matches_update on public.matches;
create policy matches_update on public.matches
  for update using (public.is_app_admin() or public.can_manage_match(id))
  with check (public.is_app_admin() or public.can_manage_match(id));

drop policy if exists matches_delete on public.matches;
create policy matches_delete on public.matches
  for delete using (public.is_app_admin() or public.can_manage_match(id));

-- match_officials
drop policy if exists match_officials_write on public.match_officials;
create policy match_officials_write on public.match_officials
  for all using (public.is_app_admin() or public.can_manage_match(match_id))
  with check (public.is_app_admin() or public.can_manage_match(match_id));

-- match_lineups
drop policy if exists match_lineups_write on public.match_lineups;
create policy match_lineups_write on public.match_lineups
  for all using (public.is_app_admin() or public.can_manage_match(match_id) or public.is_team_manager(team_id))
  with check (public.is_app_admin() or public.can_manage_match(match_id) or public.is_team_manager(team_id));

-- match_events
drop policy if exists match_events_insert on public.match_events;
create policy match_events_insert on public.match_events
  for insert with check (public.is_app_admin() or public.can_score_match(match_id));

drop policy if exists match_events_update on public.match_events;
create policy match_events_update on public.match_events
  for update using (public.is_app_admin() or public.can_score_match(match_id))
  with check (public.is_app_admin() or public.can_score_match(match_id));

drop policy if exists match_events_delete on public.match_events;
create policy match_events_delete on public.match_events
  for delete using (public.is_app_admin() or public.can_manage_match(match_id));

-- invitations
drop policy if exists invitations_insert on public.invitations;
create policy invitations_insert on public.invitations
  for insert with check (
    invited_by = auth.uid()
    and (
      public.is_app_admin()
      or (kind = 'team'           and public.is_team_manager(team_id))
      or (kind = 'competition'    and public.is_competition_organiser(competition_id))
      or (kind = 'match_official' and public.can_manage_match(match_id))
    )
  );

drop policy if exists invitations_update on public.invitations;
create policy invitations_update on public.invitations
  for update using (
    public.is_app_admin()
    or invited_by = auth.uid()
    or (kind = 'team'           and team_id is not null and public.is_team_manager(team_id))
    or (kind = 'competition'    and competition_id is not null and public.is_competition_organiser(competition_id))
    or (kind = 'match_official' and match_id is not null and public.can_manage_match(match_id))
  );
