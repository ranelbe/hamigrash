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
