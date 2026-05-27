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
