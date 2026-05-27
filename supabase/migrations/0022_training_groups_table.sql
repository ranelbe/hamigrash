-- ============================================================
-- HaMigrash — 0022: training_groups as a managed entity
-- Replaces the free-text column with a proper table so admins
-- centrally control the list of training groups.
-- ============================================================

-- Drop the previous free-text column.
alter table public.players drop column if exists training_group;

-- The catalogue table.
create table if not exists public.training_groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (name)
);

create trigger training_groups_set_updated_at
  before update on public.training_groups
  for each row execute function public.tg_set_updated_at();

-- FK on players (nullable — player can be without a group).
alter table public.players
  add column if not exists training_group_id uuid references public.training_groups(id) on delete set null;

create index if not exists players_training_group_id_idx
  on public.players (training_group_id)
  where training_group_id is not null;

-- RLS — public read, admin write.
alter table public.training_groups enable row level security;

create policy training_groups_select on public.training_groups
  for select using (true);

create policy training_groups_insert on public.training_groups
  for insert with check (public.is_app_admin());

create policy training_groups_update on public.training_groups
  for update using (public.is_app_admin())
  with check (public.is_app_admin());

create policy training_groups_delete on public.training_groups
  for delete using (public.is_app_admin());
