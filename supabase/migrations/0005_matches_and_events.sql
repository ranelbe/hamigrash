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
