-- ============================================================
-- HaMigrash — 0007: derived views, standings function
-- All stats are derived from match_events. Never edit manually.
-- ============================================================

-- Goals per (match, team) computed from events.
create or replace view public.match_scores as
with goals as (
  select
    me.match_id,
    -- A goal credits the scoring team; an own_goal credits the OTHER team.
    case
      when me.event_type = 'goal' then me.team_id
      when me.event_type = 'own_goal' then
        case
          when me.team_id = m.home_team_id then m.away_team_id
          else m.home_team_id
        end
      when me.event_type = 'penalty_scored' then me.team_id
    end as scoring_team_id,
    me.id
  from public.match_events me
  join public.matches m on m.id = me.match_id
  where me.is_cancelled = false
    and me.event_type in ('goal', 'own_goal', 'penalty_scored')
)
select
  m.id as match_id,
  m.home_team_id,
  m.away_team_id,
  m.status,
  coalesce(sum(case when g.scoring_team_id = m.home_team_id then 1 else 0 end), 0)::int as home_goals,
  coalesce(sum(case when g.scoring_team_id = m.away_team_id then 1 else 0 end), 0)::int as away_goals
from public.matches m
left join goals g on g.match_id = m.id
group by m.id, m.home_team_id, m.away_team_id, m.status;

-- League standings function: row per team in a competition.
create or replace function public.competition_standings(p_competition_id uuid)
returns table (
  competition_id  uuid,
  team_id         uuid,
  team_name       text,
  team_crest      text,
  group_label     text,
  played          int,
  wins            int,
  draws           int,
  losses          int,
  goals_for       int,
  goals_against   int,
  goal_difference int,
  points          int
)
language sql
stable
as $$
  with c as (
    select * from public.competitions where id = p_competition_id
  ),
  enrolled as (
    select ct.team_id, ct.group_label, t.name as team_name, t.crest_url as team_crest
    from public.competition_teams ct
    join public.teams t on t.id = ct.team_id
    where ct.competition_id = p_competition_id
  ),
  finished_matches as (
    select m.*, ms.home_goals, ms.away_goals
    from public.matches m
    join public.match_scores ms on ms.match_id = m.id
    where m.competition_id = p_competition_id
      and m.status = 'finished'
  ),
  per_team as (
    -- Home perspective
    select
      e.team_id,
      fm.home_goals as gf,
      fm.away_goals as ga
    from enrolled e
    join finished_matches fm on fm.home_team_id = e.team_id
    union all
    -- Away perspective
    select
      e.team_id,
      fm.away_goals as gf,
      fm.home_goals as ga
    from enrolled e
    join finished_matches fm on fm.away_team_id = e.team_id
  ),
  agg as (
    select
      pt.team_id,
      count(*)::int                                         as played,
      sum((pt.gf >  pt.ga)::int)::int                       as wins,
      sum((pt.gf =  pt.ga)::int)::int                       as draws,
      sum((pt.gf <  pt.ga)::int)::int                       as losses,
      coalesce(sum(pt.gf),0)::int                           as goals_for,
      coalesce(sum(pt.ga),0)::int                           as goals_against
    from per_team pt
    group by pt.team_id
  )
  select
    p_competition_id                                        as competition_id,
    e.team_id,
    e.team_name,
    e.team_crest,
    e.group_label,
    coalesce(a.played, 0)                                   as played,
    coalesce(a.wins, 0)                                     as wins,
    coalesce(a.draws, 0)                                    as draws,
    coalesce(a.losses, 0)                                   as losses,
    coalesce(a.goals_for, 0)                                as goals_for,
    coalesce(a.goals_against, 0)                            as goals_against,
    coalesce(a.goals_for - a.goals_against, 0)              as goal_difference,
    (coalesce(a.wins,0) * (select points_win from c)
      + coalesce(a.draws,0) * (select points_draw from c)
      + coalesce(a.losses,0) * (select points_loss from c)) as points
  from enrolled e
  left join agg a on a.team_id = e.team_id
  order by points desc, goal_difference desc, goals_for desc, team_name asc;
$$;

-- Head-to-head tiebreaker (used in JS layer if points/GD/GF tied).
create or replace function public.head_to_head(p_competition_id uuid, p_team_a uuid, p_team_b uuid)
returns int
language sql
stable
as $$
  -- Returns >0 if team_a is ahead in h2h, <0 if team_b is ahead, 0 if tied.
  with games as (
    select
      case when m.home_team_id = p_team_a then ms.home_goals else ms.away_goals end as a_goals,
      case when m.home_team_id = p_team_b then ms.home_goals else ms.away_goals end as b_goals
    from public.matches m
    join public.match_scores ms on ms.match_id = m.id
    where m.competition_id = p_competition_id
      and m.status = 'finished'
      and ((m.home_team_id = p_team_a and m.away_team_id = p_team_b)
        or (m.home_team_id = p_team_b and m.away_team_id = p_team_a))
  )
  select
    coalesce(
      sum(case when a_goals > b_goals then 3 when a_goals = b_goals then 1 else 0 end)
      - sum(case when b_goals > a_goals then 3 when a_goals = b_goals then 1 else 0 end),
      0
    )::int
  from games;
$$;

-- Player aggregate stats (per player, per competition optional).
create or replace function public.player_stats(p_player_id uuid, p_competition_id uuid default null)
returns table (
  player_id       uuid,
  appearances     int,
  goals           int,
  assists         int,
  yellow_cards    int,
  red_cards       int,
  saves           int,
  penalties_scored int,
  penalties_missed int,
  own_goals       int,
  minutes         int
)
language sql
stable
as $$
  with apps as (
    select count(*)::int as n, coalesce(sum(coalesce(ml.minutes_played, 0)),0)::int as mins
    from public.match_lineups ml
    join public.matches m on m.id = ml.match_id
    where ml.player_id = p_player_id
      and m.status = 'finished'
      and (p_competition_id is null or m.competition_id = p_competition_id)
  ),
  ev as (
    select me.event_type, count(*)::int as c
    from public.match_events me
    join public.matches m on m.id = me.match_id
    where me.player_id = p_player_id
      and me.is_cancelled = false
      and (p_competition_id is null or m.competition_id = p_competition_id)
    group by me.event_type
  )
  select
    p_player_id,
    (select n from apps)                                                     as appearances,
    coalesce((select c from ev where event_type = 'goal'),0)                 as goals,
    coalesce((select c from ev where event_type = 'assist'),0)               as assists,
    coalesce((select c from ev where event_type = 'yellow_card'),0)          as yellow_cards,
    coalesce((select c from ev where event_type = 'red_card'),0)             as red_cards,
    coalesce((select c from ev where event_type = 'save'),0)                 as saves,
    coalesce((select c from ev where event_type = 'penalty_scored'),0)       as penalties_scored,
    coalesce((select c from ev where event_type = 'penalty_missed'),0)       as penalties_missed,
    coalesce((select c from ev where event_type = 'own_goal'),0)             as own_goals,
    (select mins from apps)                                                  as minutes;
$$;

-- Top scorers for a competition.
create or replace view public.competition_top_scorers as
select
  m.competition_id,
  me.player_id,
  p.display_name,
  p.team_id,
  count(*)::int as goals
from public.match_events me
join public.matches m on m.id = me.match_id
join public.players p on p.id = me.player_id
where me.event_type in ('goal', 'penalty_scored')
  and me.is_cancelled = false
  and m.status = 'finished'
  and me.player_id is not null
group by m.competition_id, me.player_id, p.display_name, p.team_id;
