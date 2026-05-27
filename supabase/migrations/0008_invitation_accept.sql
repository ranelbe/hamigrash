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
