-- ============================================================
-- HaMigrash — 0009: RLS helper functions (SECURITY DEFINER)
-- Centralise permission checks so policies stay readable and
-- avoid recursive RLS pitfalls when joining membership tables.
-- ============================================================

create or replace function public.is_team_member(p_team_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.team_members
    where team_id = p_team_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_team_manager(p_team_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.team_members
    where team_id = p_team_id and user_id = auth.uid()
      and role in ('manager', 'assistant')
  );
$$;

create or replace function public.is_competition_organiser(p_competition_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.competition_members
    where competition_id = p_competition_id and user_id = auth.uid()
      and role in ('organiser', 'admin')
  );
$$;

create or replace function public.is_competition_scorer(p_competition_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.competition_members
    where competition_id = p_competition_id and user_id = auth.uid()
      and role in ('organiser', 'admin', 'scorer')
  );
$$;

create or replace function public.can_score_match(p_match_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.matches m
    where m.id = p_match_id
      and (
        exists (
          select 1 from public.match_officials mo
          where mo.match_id = m.id and mo.user_id = auth.uid()
            and mo.role in ('referee', 'scorer')
        )
        or (m.competition_id is not null and public.is_competition_scorer(m.competition_id))
        or public.is_team_manager(m.home_team_id)
        or public.is_team_manager(m.away_team_id)
      )
  );
$$;

create or replace function public.can_manage_match(p_match_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.matches m
    where m.id = p_match_id
      and (
        (m.competition_id is not null and public.is_competition_organiser(m.competition_id))
        or public.is_team_manager(m.home_team_id)
        or public.is_team_manager(m.away_team_id)
      )
  );
$$;
