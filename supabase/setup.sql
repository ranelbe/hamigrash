-- ============================================================
-- HaMigrash — combined setup script
-- Runs all migrations 0001..0012 in order. Idempotent-ish.
-- Paste into Supabase SQL Editor and click Run.
-- ============================================================


-- ============================================================
-- >>> migrations/0001_extensions_and_enums.sql
-- ============================================================
-- ============================================================
-- HaMigrash — 0001: extensions and enums
-- ============================================================

create extension if not exists "pgcrypto";
create extension if not exists "citext";
create extension if not exists "uuid-ossp";

-- ---- Enums --------------------------------------------------

create type team_member_role as enum ('manager', 'assistant', 'player', 'pending');

create type competition_member_role as enum ('organiser', 'admin', 'scorer');

create type match_official_role as enum ('referee', 'scorer', 'assistant');

create type invitation_kind as enum ('team', 'competition', 'match_official');

create type invitation_status as enum ('pending', 'accepted', 'revoked', 'expired');

create type competition_type as enum ('league', 'cup', 'friendly');

create type competition_status as enum ('draft', 'active', 'finished', 'archived');

create type match_status as enum ('scheduled', 'live', 'finished', 'cancelled');

create type match_format as enum ('5v5', '6v6', '7v7', '8v8', '9v9', '10v10', '11v11');

create type match_event_type as enum (
  'goal', 'own_goal', 'assist', 'yellow_card', 'red_card',
  'substitution_in', 'substitution_out', 'save', 'penalty_scored',
  'penalty_missed', 'period_start', 'period_end'
);

create type player_position as enum ('GK', 'DF', 'MF', 'FW');


-- ============================================================
-- >>> migrations/0002_profiles.sql
-- ============================================================
-- ============================================================
-- HaMigrash — 0002: profiles
-- Mirrors auth.users; created automatically on signup.
-- ============================================================

create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           citext not null unique,
  full_name       text,
  avatar_url      text,
  locale          text not null default 'he',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index profiles_email_idx on public.profiles (email);

-- Auto-create profile on auth.users insert
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at maintenance
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.tg_set_updated_at();


-- ============================================================
-- >>> migrations/0003_teams_players.sql
-- ============================================================
-- ============================================================
-- HaMigrash — 0003: teams, team_members, players
-- ============================================================

create table public.teams (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  name            text not null,
  short_name      text,
  crest_url       text,
  primary_color   text default '#16a34a',
  secondary_color text default '#0f172a',
  home_venue      text,
  created_by      uuid not null references public.profiles(id) on delete restrict,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index teams_created_by_idx on public.teams (created_by);

create trigger teams_set_updated_at
  before update on public.teams
  for each row execute function public.tg_set_updated_at();

-- Team membership (per-entity permissions)
create table public.team_members (
  team_id     uuid not null references public.teams(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  role        team_member_role not null default 'player',
  created_at  timestamptz not null default now(),
  primary key (team_id, user_id)
);

create index team_members_user_idx on public.team_members (user_id);

-- Players belong to a team. May or may not be linked to a profile.
create table public.players (
  id              uuid primary key default gen_random_uuid(),
  team_id         uuid not null references public.teams(id) on delete cascade,
  profile_id      uuid references public.profiles(id) on delete set null,
  display_name    text not null,
  squad_number    int,
  position        player_position not null default 'MF',
  photo_url       text,
  is_active       boolean not null default true,
  -- OVR attributes (0-99)
  rating_pace        smallint check (rating_pace between 0 and 99),
  rating_shooting    smallint check (rating_shooting between 0 and 99),
  rating_passing     smallint check (rating_passing between 0 and 99),
  rating_dribbling   smallint check (rating_dribbling between 0 and 99),
  rating_defending   smallint check (rating_defending between 0 and 99),
  rating_physical    smallint check (rating_physical between 0 and 99),
  -- GK-specific
  rating_gk_diving       smallint check (rating_gk_diving between 0 and 99),
  rating_gk_handling     smallint check (rating_gk_handling between 0 and 99),
  rating_gk_kicking      smallint check (rating_gk_kicking between 0 and 99),
  rating_gk_reflexes     smallint check (rating_gk_reflexes between 0 and 99),
  rating_gk_speed        smallint check (rating_gk_speed between 0 and 99),
  rating_gk_positioning  smallint check (rating_gk_positioning between 0 and 99),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (team_id, squad_number)
);

create index players_team_idx on public.players (team_id);
create index players_profile_idx on public.players (profile_id);

create trigger players_set_updated_at
  before update on public.players
  for each row execute function public.tg_set_updated_at();

-- Derived OVR (single value 0-99)
create or replace function public.player_ovr(p public.players)
returns smallint
language sql
immutable
as $$
  select case
    when p.position = 'GK' then
      coalesce((
        coalesce(p.rating_gk_diving,0)
        + coalesce(p.rating_gk_handling,0)
        + coalesce(p.rating_gk_kicking,0)
        + coalesce(p.rating_gk_reflexes,0)
        + coalesce(p.rating_gk_speed,0)
        + coalesce(p.rating_gk_positioning,0)
      ) / nullif(6,0), 0)::smallint
    else
      coalesce((
        coalesce(p.rating_pace,0)
        + coalesce(p.rating_shooting,0)
        + coalesce(p.rating_passing,0)
        + coalesce(p.rating_dribbling,0)
        + coalesce(p.rating_defending,0)
        + coalesce(p.rating_physical,0)
      ) / nullif(6,0), 0)::smallint
  end;
$$;


-- ============================================================
-- >>> migrations/0004_competitions.sql
-- ============================================================
-- ============================================================
-- HaMigrash — 0004: competitions, competition_teams, members
-- ============================================================

create table public.competitions (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique,
  name               text not null,
  type               competition_type not null,
  status             competition_status not null default 'draft',
  format             match_format not null default '11v11',
  season             text,
  starts_on          date,
  ends_on            date,
  points_win         smallint not null default 3,
  points_draw        smallint not null default 1,
  points_loss        smallint not null default 0,
  rounds             smallint not null default 1,   -- 1 = single round-robin, 2 = double, etc.
  has_group_stage    boolean not null default false,
  created_by         uuid not null references public.profiles(id) on delete restrict,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (points_win >= points_draw),
  check (points_draw >= points_loss)
);

create index competitions_status_idx on public.competitions (status);
create index competitions_type_idx on public.competitions (type);

create trigger competitions_set_updated_at
  before update on public.competitions
  for each row execute function public.tg_set_updated_at();

-- Teams enrolled in a competition
create table public.competition_teams (
  competition_id uuid not null references public.competitions(id) on delete cascade,
  team_id        uuid not null references public.teams(id) on delete restrict,
  group_label    text,                              -- 'A', 'B', null for league
  seed           smallint,                           -- for cup brackets
  joined_at      timestamptz not null default now(),
  primary key (competition_id, team_id)
);

create index competition_teams_team_idx on public.competition_teams (team_id);

-- Organisers / scorers attached to a competition
create table public.competition_members (
  competition_id uuid not null references public.competitions(id) on delete cascade,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  role           competition_member_role not null,
  created_at     timestamptz not null default now(),
  primary key (competition_id, user_id)
);

create index competition_members_user_idx on public.competition_members (user_id);


-- ============================================================
-- >>> migrations/0005_matches_and_events.sql
-- ============================================================
-- ============================================================
-- HaMigrash — 0005: matches, lineups, events, officials
-- ============================================================

create table public.matches (
  id                 uuid primary key default gen_random_uuid(),
  competition_id     uuid references public.competitions(id) on delete set null,
  home_team_id       uuid not null references public.teams(id) on delete restrict,
  away_team_id       uuid not null references public.teams(id) on delete restrict,
  scheduled_at       timestamptz,
  status             match_status not null default 'scheduled',
  venue              text,
  round_label        text,                          -- e.g. 'Round 3' or 'Quarterfinal'
  bracket_round      smallint,                       -- for cups (0=final, 1=SF, 2=QF...)
  bracket_slot       smallint,                       -- bracket position
  format             match_format,
  period_length_min  smallint not null default 45,
  number_of_periods  smallint not null default 2,
  started_at         timestamptz,
  finished_at        timestamptz,
  notes              text,
  created_by         uuid references public.profiles(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (home_team_id <> away_team_id)
);

create index matches_competition_idx on public.matches (competition_id);
create index matches_home_idx on public.matches (home_team_id);
create index matches_away_idx on public.matches (away_team_id);
create index matches_status_scheduled_idx on public.matches (status, scheduled_at);

create trigger matches_set_updated_at
  before update on public.matches
  for each row execute function public.tg_set_updated_at();

-- Match officials (referees, scorers assigned to a specific match)
create table public.match_officials (
  match_id   uuid not null references public.matches(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       match_official_role not null,
  created_at timestamptz not null default now(),
  primary key (match_id, user_id, role)
);

create index match_officials_user_idx on public.match_officials (user_id);

-- Lineups (which players were on which team for a match)
create table public.match_lineups (
  match_id    uuid not null references public.matches(id) on delete cascade,
  player_id   uuid not null references public.players(id) on delete cascade,
  team_id     uuid not null references public.teams(id) on delete restrict,
  is_starter  boolean not null default true,
  shirt_number int,
  minutes_played smallint,                         -- derived from substitutions; nullable
  primary key (match_id, player_id)
);

create index match_lineups_team_idx on public.match_lineups (match_id, team_id);

-- Match events — THE SINGLE SOURCE OF TRUTH for all derived stats.
create table public.match_events (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid unique,                      -- offline-queue idempotency key
  match_id        uuid not null references public.matches(id) on delete cascade,
  team_id         uuid references public.teams(id) on delete set null,
  player_id       uuid references public.players(id) on delete set null,
  related_player_id uuid references public.players(id) on delete set null, -- assist target, sub partner
  event_type      match_event_type not null,
  period          smallint not null default 1,
  minute          smallint,                          -- 0-120+
  extra_minute    smallint default 0,
  payload         jsonb not null default '{}'::jsonb,
  recorded_by     uuid references public.profiles(id) on delete set null,
  recorded_at     timestamptz not null default now(),
  is_cancelled    boolean not null default false
);

create index match_events_match_idx on public.match_events (match_id, period, minute, extra_minute);
create index match_events_player_idx on public.match_events (player_id) where player_id is not null;
create index match_events_team_idx on public.match_events (team_id) where team_id is not null;
create index match_events_type_idx on public.match_events (event_type);


-- ============================================================
-- >>> migrations/0006_invitations_and_shares.sql
-- ============================================================
-- ============================================================
-- HaMigrash — 0006: invitations + public share links
-- ============================================================

create table public.invitations (
  id              uuid primary key default gen_random_uuid(),
  token           text not null unique default encode(gen_random_bytes(24), 'hex'),
  email           citext not null,
  kind            invitation_kind not null,
  status          invitation_status not null default 'pending',
  -- target entity (exactly one based on kind)
  team_id         uuid references public.teams(id) on delete cascade,
  competition_id  uuid references public.competitions(id) on delete cascade,
  match_id        uuid references public.matches(id) on delete cascade,
  -- role to assign on acceptance
  team_role          team_member_role,
  competition_role   competition_member_role,
  match_role         match_official_role,
  invited_by      uuid not null references public.profiles(id) on delete restrict,
  message         text,
  expires_at      timestamptz not null default (now() + interval '14 days'),
  accepted_at     timestamptz,
  accepted_by     uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  check (
    (kind = 'team'           and team_id is not null and team_role is not null) or
    (kind = 'competition'    and competition_id is not null and competition_role is not null) or
    (kind = 'match_official' and match_id is not null and match_role is not null)
  )
);

create index invitations_email_status_idx on public.invitations (email, status);
create index invitations_token_idx on public.invitations (token);
create index invitations_team_idx on public.invitations (team_id) where team_id is not null;
create index invitations_competition_idx on public.invitations (competition_id) where competition_id is not null;
create index invitations_match_idx on public.invitations (match_id) where match_id is not null;

-- Public share links (read-only access to a single entity)
create table public.share_links (
  id            uuid primary key default gen_random_uuid(),
  token         text not null unique default encode(gen_random_bytes(16), 'hex'),
  team_id       uuid references public.teams(id) on delete cascade,
  competition_id uuid references public.competitions(id) on delete cascade,
  match_id      uuid references public.matches(id) on delete cascade,
  player_id     uuid references public.players(id) on delete cascade,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  check (num_nonnulls(team_id, competition_id, match_id, player_id) = 1)
);


-- ============================================================
-- >>> migrations/0007_views_and_standings.sql
-- ============================================================
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


-- ============================================================
-- >>> migrations/0008_invitation_accept.sql
-- ============================================================
-- ============================================================
-- HaMigrash — 0008: invitation acceptance flow
-- Called by Edge Function / API route after Google login succeeds.
-- ============================================================

create or replace function public.accept_invitation(p_token text)
returns table (kind invitation_kind, entity_id uuid, role text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id  uuid := auth.uid();
  v_email    citext;
  v_inv      public.invitations%rowtype;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select email into v_email from public.profiles where id = v_user_id;

  select * into v_inv
  from public.invitations
  where token = p_token
  limit 1;

  if not found then
    raise exception 'invitation_not_found' using errcode = 'P0002';
  end if;

  if v_inv.status <> 'pending' then
    raise exception 'invitation_not_pending' using errcode = 'P0001';
  end if;

  if v_inv.expires_at < now() then
    update public.invitations set status = 'expired' where id = v_inv.id;
    raise exception 'invitation_expired' using errcode = 'P0001';
  end if;

  if lower(v_inv.email) <> lower(v_email) then
    raise exception 'invitation_email_mismatch' using errcode = 'P0001';
  end if;

  if v_inv.kind = 'team' then
    insert into public.team_members (team_id, user_id, role)
    values (v_inv.team_id, v_user_id, v_inv.team_role)
    on conflict (team_id, user_id) do update set role = excluded.role;
    update public.invitations set status = 'accepted', accepted_at = now(), accepted_by = v_user_id where id = v_inv.id;
    return query select 'team'::invitation_kind, v_inv.team_id, v_inv.team_role::text;

  elsif v_inv.kind = 'competition' then
    insert into public.competition_members (competition_id, user_id, role)
    values (v_inv.competition_id, v_user_id, v_inv.competition_role)
    on conflict (competition_id, user_id) do update set role = excluded.role;
    update public.invitations set status = 'accepted', accepted_at = now(), accepted_by = v_user_id where id = v_inv.id;
    return query select 'competition'::invitation_kind, v_inv.competition_id, v_inv.competition_role::text;

  elsif v_inv.kind = 'match_official' then
    insert into public.match_officials (match_id, user_id, role)
    values (v_inv.match_id, v_user_id, v_inv.match_role)
    on conflict (match_id, user_id, role) do nothing;
    update public.invitations set status = 'accepted', accepted_at = now(), accepted_by = v_user_id where id = v_inv.id;
    return query select 'match_official'::invitation_kind, v_inv.match_id, v_inv.match_role::text;
  end if;
end;
$$;

-- Auto-claim any pending invitations matching a freshly-confirmed user's email.
-- (Optional convenience; the API also calls accept_invitation explicitly with a token.)
create or replace function public.claim_pending_invitations()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email   citext;
  v_count   int := 0;
  v_inv     public.invitations%rowtype;
begin
  if v_user_id is null then return 0; end if;
  select email into v_email from public.profiles where id = v_user_id;

  for v_inv in
    select * from public.invitations
    where lower(email) = lower(v_email)
      and status = 'pending'
      and expires_at > now()
  loop
    perform public.accept_invitation(v_inv.token);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;


-- ============================================================
-- >>> migrations/0009_rls_helpers.sql
-- ============================================================
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


-- ============================================================
-- >>> migrations/0010_rls_policies.sql
-- ============================================================
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


-- ============================================================
-- >>> migrations/0011_triggers.sql
-- ============================================================
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


-- ============================================================
-- >>> migrations/0012_realtime.sql
-- ============================================================
-- ============================================================
-- HaMigrash — 0012: enable realtime publications
-- ============================================================

-- Replicate row changes for live match pages and dashboards.
alter publication supabase_realtime add table public.match_events;
alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.match_lineups;

