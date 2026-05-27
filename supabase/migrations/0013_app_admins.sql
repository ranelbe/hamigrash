-- ============================================================
-- HaMigrash — 0013: app_admins (invitation-only creation)
-- Locks `teams` and `competitions` INSERT to platform admins.
-- Everyone else must arrive via an invitation. Spec §5.
-- ============================================================

create table if not exists public.app_admins (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  granted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create or replace function public.is_app_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.app_admins where user_id = auth.uid());
$$;

-- Tighten teams.insert: only app admins, OR a user fulfilling an
-- accepted "team manager" invitation (handled by accept_invitation,
-- which runs as security definer and bypasses this policy).
drop policy if exists teams_insert on public.teams;
create policy teams_insert on public.teams
  for insert with check (
    created_by = auth.uid()
    and public.is_app_admin()
  );

-- Tighten competitions.insert similarly.
drop policy if exists competitions_insert on public.competitions;
create policy competitions_insert on public.competitions
  for insert with check (
    created_by = auth.uid()
    and public.is_app_admin()
  );

-- app_admins is readable so the UI can hide creation buttons.
alter table public.app_admins enable row level security;

create policy app_admins_select on public.app_admins for select using (true);

-- Only existing admins can add new admins (or you, via the SQL editor).
create policy app_admins_insert on public.app_admins
  for insert with check (public.is_app_admin());

create policy app_admins_delete on public.app_admins
  for delete using (public.is_app_admin());
