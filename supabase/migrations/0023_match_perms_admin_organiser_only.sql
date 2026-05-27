-- ============================================================
-- 0023: Match management — admin + competition organiser only.
-- ============================================================
-- Previously, can_manage_match / can_score_match allowed team managers
-- to manage and score matches involving their own team. That's a
-- conflict of interest (a manager could fudge their own scores).
--
-- New rules:
--   • can_manage_match — admin OR competition organiser ONLY.
--     (deletes / edits match details, deletes events, manages officials)
--   • can_score_match  — admin OR competition organiser OR match official
--     ONLY. (records goals, cards, etc.)
--   • Match creation   — admin OR competition organiser ONLY.
--                        (friendlies with no competition → admin only)
--
-- Team managers RETAIN the ability to submit their team's lineup
-- (match_lineups) — that's their legitimate responsibility, not score
-- reporting.
-- ============================================================

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
        -- NOTE: is_team_manager intentionally removed — conflict of interest.
      )
  );
$$;

create or replace function public.can_manage_match(p_match_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.matches m
    where m.id = p_match_id
      and (
        m.competition_id is not null and public.is_competition_organiser(m.competition_id)
        -- NOTE: is_team_manager intentionally removed — conflict of interest.
      )
  );
$$;

-- Tighten the matches INSERT policy: team managers can no longer create
-- friendlies between two teams. Only admin / competition organiser can.
drop policy if exists matches_insert on public.matches;
create policy matches_insert on public.matches
  for insert with check (
    public.is_app_admin()
    or (competition_id is not null and public.is_competition_organiser(competition_id))
  );

-- Refresh PostgREST schema cache so RPC + policy changes take effect immediately.
notify pgrst, 'reload schema';
