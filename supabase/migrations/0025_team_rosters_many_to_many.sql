-- ============================================================
-- 0025: many-to-many team membership via team_rosters
-- ============================================================
-- Pre: every player had a single team via players.team_id (NOT NULL),
-- and unassigned players sat in a synthetic 'שחקנים חופשיים' pool team.
-- Post: a player can be a member of any number of teams via team_rosters.
-- The pool team becomes meaningless and gets dropped.
--
-- Backward compatibility: players.team_id is KEPT and becomes NULLABLE.
-- Code that still reads players.team_id (player detail, edit, RLS helpers)
-- keeps working with the legacy "primary team" value during the
-- transition. New code reads team_rosters.
-- ============================================================

-- ---------- 1. Junction table ----------
create table if not exists public.team_rosters (
  team_id      uuid not null references public.teams(id)   on delete cascade,
  player_id    uuid not null references public.players(id) on delete cascade,
  squad_number smallint,
  joined_at    timestamptz not null default now(),
  primary key (team_id, player_id),
  unique (team_id, squad_number)
);

create index if not exists team_rosters_player_idx on public.team_rosters (player_id);
create index if not exists team_rosters_team_idx   on public.team_rosters (team_id);

-- ---------- 2. Backfill from existing 1:N data ----------
insert into public.team_rosters (team_id, player_id, squad_number, joined_at)
select team_id, id, squad_number, created_at
from public.players
where team_id is not null
on conflict (team_id, player_id) do nothing;

-- ---------- 3. Relax players.team_id (kept nullable for legacy reads) ----------
alter table public.players alter column team_id drop not null;

-- ---------- 4. RLS for team_rosters ----------
alter table public.team_rosters enable row level security;

drop policy if exists team_rosters_read on public.team_rosters;
create policy team_rosters_read on public.team_rosters
  for select using (true);

drop policy if exists team_rosters_write on public.team_rosters;
create policy team_rosters_write on public.team_rosters
  for all
  using (public.is_app_admin() or public.is_team_manager(team_id))
  with check (public.is_app_admin() or public.is_team_manager(team_id));

-- ---------- 5. Drop the synthetic pool team ----------
-- Players inside the pool stay (no on-delete-cascade through team_id since
-- we relaxed NOT NULL above — they end up team-less in players.team_id,
-- which is fine; their roster entries are unaffected).
update public.players
set team_id = null
where team_id in (select id from public.teams where name = 'שחקנים חופשיים');

delete from public.team_rosters
where team_id in (select id from public.teams where name = 'שחקנים חופשיים');

delete from public.teams where name = 'שחקנים חופשיים';

-- ---------- 6. Refresh PostgREST ----------
notify pgrst, 'reload schema';
