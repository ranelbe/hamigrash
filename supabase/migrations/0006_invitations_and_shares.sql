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
