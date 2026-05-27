-- ============================================================
-- HaMigrash — 0011: bookkeeping triggers
-- ============================================================

-- When a team is created, attach its creator as manager.
create or replace function public.tg_attach_team_creator()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.team_members (team_id, user_id, role)
  values (new.id, new.created_by, 'manager')
  on conflict (team_id, user_id) do update set role = 'manager';
  return new;
end;
$$;

drop trigger if exists teams_attach_creator on public.teams;
create trigger teams_attach_creator
  after insert on public.teams
  for each row execute function public.tg_attach_team_creator();

-- When a competition is created, attach its creator as organiser.
create or replace function public.tg_attach_competition_creator()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.competition_members (competition_id, user_id, role)
  values (new.id, new.created_by, 'organiser')
  on conflict (competition_id, user_id) do update set role = 'organiser';
  return new;
end;
$$;

drop trigger if exists competitions_attach_creator on public.competitions;
create trigger competitions_attach_creator
  after insert on public.competitions
  for each row execute function public.tg_attach_competition_creator();

-- Auto-flip match status to 'live' when first non-period event is recorded
-- and to 'finished' when a 'period_end' for the final period arrives.
create or replace function public.tg_match_status_from_event()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_match public.matches%rowtype;
begin
  select * into v_match from public.matches where id = new.match_id;
  if v_match.status = 'scheduled' and new.event_type <> 'period_end' then
    update public.matches
       set status = 'live',
           started_at = coalesce(started_at, now())
     where id = new.match_id;
  end if;
  if new.event_type = 'period_end'
     and new.period >= v_match.number_of_periods then
    update public.matches
       set status = 'finished',
           finished_at = coalesce(finished_at, now())
     where id = new.match_id;
  end if;
  return new;
end;
$$;

drop trigger if exists match_events_status on public.match_events;
create trigger match_events_status
  after insert on public.match_events
  for each row execute function public.tg_match_status_from_event();
