-- ============================================================
-- HaMigrash — 0010: Row-Level Security policies
-- Reading is generally public (the product is a public results
-- platform). Writing is strictly entity-scoped.
-- ============================================================

-- Enable RLS on every public table.
alter table public.profiles            enable row level security;
alter table public.teams               enable row level security;
alter table public.team_members        enable row level security;
alter table public.players             enable row level security;
alter table public.competitions        enable row level security;
alter table public.competition_teams   enable row level security;
alter table public.competition_members enable row level security;
alter table public.matches             enable row level security;
alter table public.match_officials     enable row level security;
alter table public.match_lineups       enable row level security;
alter table public.match_events        enable row level security;
alter table public.invitations         enable row level security;
alter table public.share_links         enable row level security;

-- ---- profiles ----------------------------------------------
create policy profiles_self_select on public.profiles
  for select using (true); -- public profiles (name + avatar)

create policy profiles_self_update on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ---- teams -------------------------------------------------
create policy teams_select on public.teams
  for select using (true);

create policy teams_insert on public.teams
  for insert with check (created_by = auth.uid());

create policy teams_update on public.teams
  for update using (public.is_team_manager(id)) with check (public.is_team_manager(id));

create policy teams_delete on public.teams
  for delete using (created_by = auth.uid());

-- After a team is inserted the creator is added as manager (trigger 0011).

-- ---- team_members ------------------------------------------
create policy team_members_select on public.team_members
  for select using (true);

-- Only team managers can directly insert/update/delete members.
-- (Normal flow is via accept_invitation which is SECURITY DEFINER.)
create policy team_members_insert on public.team_members
  for insert with check (public.is_team_manager(team_id));

create policy team_members_update on public.team_members
  for update using (public.is_team_manager(team_id)) with check (public.is_team_manager(team_id));

create policy team_members_delete on public.team_members
  for delete using (public.is_team_manager(team_id) or user_id = auth.uid());

-- ---- players -----------------------------------------------
create policy players_select on public.players
  for select using (true);

create policy players_write on public.players
  for all using (public.is_team_manager(team_id))
  with check (public.is_team_manager(team_id));

-- ---- competitions ------------------------------------------
create policy competitions_select on public.competitions
  for select using (true);

create policy competitions_insert on public.competitions
  for insert with check (created_by = auth.uid());

create policy competitions_update on public.competitions
  for update using (public.is_competition_organiser(id))
  with check (public.is_competition_organiser(id));

create policy competitions_delete on public.competitions
  for delete using (created_by = auth.uid());

-- ---- competition_teams -------------------------------------
create policy competition_teams_select on public.competition_teams
  for select using (true);

create policy competition_teams_write on public.competition_teams
  for all using (public.is_competition_organiser(competition_id))
  with check (public.is_competition_organiser(competition_id));

-- ---- competition_members -----------------------------------
create policy competition_members_select on public.competition_members
  for select using (true);

create policy competition_members_write on public.competition_members
  for all using (public.is_competition_organiser(competition_id))
  with check (public.is_competition_organiser(competition_id));

-- ---- matches -----------------------------------------------
create policy matches_select on public.matches
  for select using (true);

create policy matches_insert on public.matches
  for insert with check (
    (competition_id is not null and public.is_competition_organiser(competition_id))
    or (competition_id is null and (
      public.is_team_manager(home_team_id) or public.is_team_manager(away_team_id)
    ))
  );

create policy matches_update on public.matches
  for update using (public.can_manage_match(id))
  with check (public.can_manage_match(id));

create policy matches_delete on public.matches
  for delete using (public.can_manage_match(id));

-- ---- match_officials ---------------------------------------
create policy match_officials_select on public.match_officials
  for select using (true);

create policy match_officials_write on public.match_officials
  for all using (public.can_manage_match(match_id))
  with check (public.can_manage_match(match_id));

-- ---- match_lineups -----------------------------------------
create policy match_lineups_select on public.match_lineups
  for select using (true);

create policy match_lineups_write on public.match_lineups
  for all using (public.can_manage_match(match_id) or public.is_team_manager(team_id))
  with check (public.can_manage_match(match_id) or public.is_team_manager(team_id));

-- ---- match_events ------------------------------------------
create policy match_events_select on public.match_events
  for select using (true);

create policy match_events_insert on public.match_events
  for insert with check (public.can_score_match(match_id));

create policy match_events_update on public.match_events
  for update using (public.can_score_match(match_id))
  with check (public.can_score_match(match_id));

create policy match_events_delete on public.match_events
  for delete using (public.can_manage_match(match_id));

-- ---- invitations -------------------------------------------
-- Visible to inviter, or to a user whose email matches.
create policy invitations_select on public.invitations
  for select using (
    invited_by = auth.uid()
    or lower(email) = lower(coalesce((select email from public.profiles where id = auth.uid()), ''))
    or (kind = 'team' and team_id is not null and public.is_team_manager(team_id))
    or (kind = 'competition' and competition_id is not null and public.is_competition_organiser(competition_id))
    or (kind = 'match_official' and match_id is not null and public.can_manage_match(match_id))
  );

create policy invitations_insert on public.invitations
  for insert with check (
    invited_by = auth.uid()
    and (
      (kind = 'team'           and public.is_team_manager(team_id))
      or (kind = 'competition' and public.is_competition_organiser(competition_id))
      or (kind = 'match_official' and public.can_manage_match(match_id))
    )
  );

create policy invitations_update on public.invitations
  for update using (
    invited_by = auth.uid()
    or (kind = 'team'           and team_id is not null and public.is_team_manager(team_id))
    or (kind = 'competition'    and competition_id is not null and public.is_competition_organiser(competition_id))
    or (kind = 'match_official' and match_id is not null and public.can_manage_match(match_id))
  );

-- ---- share_links -------------------------------------------
create policy share_links_select on public.share_links for select using (true);
create policy share_links_insert on public.share_links for insert with check (created_by = auth.uid());
create policy share_links_delete on public.share_links for delete using (created_by = auth.uid());
