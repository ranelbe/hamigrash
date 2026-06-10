-- ============================================================
-- 0026: Invitations decoupled from email
-- ============================================================
-- Previously the invitation row required an email AND the accept RPC
-- enforced that the accepting user's Google account email match it.
-- That made the link useless unless the admin knew the exact email of
-- the invitee in advance.
--
-- New model:
--   • email is OPTIONAL — only used to auto-send the link via Resend
--   • the TOKEN is the only secret — anyone who has it can accept,
--     regardless of which email they log in with
-- ============================================================

-- Relax NOT NULL on email.
alter table public.invitations alter column email drop not null;

-- accept_invitation: drop the email-match check.
create or replace function public.accept_invitation(p_token text)
returns table (kind invitation_kind, entity_id uuid, role text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id  uuid := auth.uid();
  v_inv      public.invitations%rowtype;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

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

  -- NOTE: no email match check. The token is the secret. The admin
  -- shares the link via WhatsApp / email / QR / whatever, and whoever
  -- ends up holding it gets the membership row.

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
    on conflict (match_id, user_id) do update set role = excluded.role;
    update public.invitations set status = 'accepted', accepted_at = now(), accepted_by = v_user_id where id = v_inv.id;
    return query select 'match_official'::invitation_kind, v_inv.match_id, v_inv.match_role::text;
  end if;
end;
$$;

-- claim_pending_invitations: the legacy 'auto-claim on first login by
-- matching the user's email to any pending invitation' becomes a no-op.
-- With the new model, users must click the actual invitation link.
-- We keep the function for backwards compat with the callsite, but it
-- just returns 0 (nothing claimed).
create or replace function public.claim_pending_invitations()
returns int
language plpgsql
security definer
set search_path = public
as $$
begin
  return 0;
end;
$$;

notify pgrst, 'reload schema';
