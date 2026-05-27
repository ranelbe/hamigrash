-- ============================================================
-- HaMigrash — seed: 4 mock users for role testing
-- ============================================================
-- Run AFTER reset-players-only.sql (needs at least one team).
-- All 4 users get the SAME password: Test1234!
--
-- admin@test.com      → app admin (sees everything)
-- manager@test.com    → manager of the first non-pool team
-- organiser@test.com  → organiser of (an existing OR newly-created) competition
-- viewer@test.com     → no role (read-only)
-- ============================================================

create extension if not exists pgcrypto;

do $$
declare
  v_admin     uuid := gen_random_uuid();
  v_manager   uuid := gen_random_uuid();
  v_organiser uuid := gen_random_uuid();
  v_viewer    uuid := gen_random_uuid();
  v_team_id   uuid;
  v_comp_id   uuid;
  v_owner_id  uuid;  -- created_by FK on competitions
begin
  -- Idempotent: wipe previous mock users by email so this can re-run.
  -- auth.users → cascades to public.profiles → cascades to memberships.
  delete from auth.users
   where email in ('admin@test.com', 'manager@test.com', 'organiser@test.com', 'viewer@test.com');

  -- ---------- 1. auth.users (bcrypt-hashed password, email pre-confirmed) ----------
  insert into auth.users
    (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
     raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values
    ('00000000-0000-0000-0000-000000000000', v_admin,     'authenticated', 'authenticated',
     'admin@test.com',     crypt('Test1234!', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     jsonb_build_object('full_name', 'אדמין בדיקה'), now(), now()),

    ('00000000-0000-0000-0000-000000000000', v_manager,   'authenticated', 'authenticated',
     'manager@test.com',   crypt('Test1234!', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     jsonb_build_object('full_name', 'מנהל קבוצה'), now(), now()),

    ('00000000-0000-0000-0000-000000000000', v_organiser, 'authenticated', 'authenticated',
     'organiser@test.com', crypt('Test1234!', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     jsonb_build_object('full_name', 'מארגן תחרות'), now(), now()),

    ('00000000-0000-0000-0000-000000000000', v_viewer,    'authenticated', 'authenticated',
     'viewer@test.com',    crypt('Test1234!', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     jsonb_build_object('full_name', 'צופה רגיל'), now(), now());

  -- ---------- 2. auth.identities (required for email/password login) ----------
  insert into auth.identities
    (id, user_id, provider_id, provider, identity_data, created_at, updated_at, last_sign_in_at)
  values
    (gen_random_uuid(), v_admin,     v_admin::text,     'email',
     jsonb_build_object('sub', v_admin::text,     'email', 'admin@test.com',     'email_verified', true), now(), now(), now()),
    (gen_random_uuid(), v_manager,   v_manager::text,   'email',
     jsonb_build_object('sub', v_manager::text,   'email', 'manager@test.com',   'email_verified', true), now(), now(), now()),
    (gen_random_uuid(), v_organiser, v_organiser::text, 'email',
     jsonb_build_object('sub', v_organiser::text, 'email', 'organiser@test.com', 'email_verified', true), now(), now(), now()),
    (gen_random_uuid(), v_viewer,    v_viewer::text,    'email',
     jsonb_build_object('sub', v_viewer::text,    'email', 'viewer@test.com',    'email_verified', true), now(), now(), now());

  -- public.profiles is auto-created by handle_new_user trigger — just patch full_name in case.
  update public.profiles set full_name = 'אדמין בדיקה'  where id = v_admin;
  update public.profiles set full_name = 'מנהל קבוצה'   where id = v_manager;
  update public.profiles set full_name = 'מארגן תחרות'  where id = v_organiser;
  update public.profiles set full_name = 'צופה רגיל'    where id = v_viewer;

  -- ---------- 3. Role assignments ----------
  -- 3a. app admin
  insert into public.app_admins (user_id) values (v_admin) on conflict do nothing;

  -- 3b. team manager — pick first real team (skip the "שחקנים חופשיים" pool if it exists)
  select id into v_team_id
    from public.teams
   where name <> 'שחקנים חופשיים'
   order by created_at
   limit 1;
  if v_team_id is null then
    select id into v_team_id from public.teams order by created_at limit 1;
  end if;
  if v_team_id is not null then
    insert into public.team_members (team_id, user_id, role)
    values (v_team_id, v_manager, 'manager')
    on conflict (team_id, user_id) do update set role = 'manager';
  else
    raise notice 'No teams exist — manager has no team to manage. Run reset-players-only.sql first.';
  end if;

  -- 3c. competition organiser — reuse first competition, otherwise create a demo one
  select id into v_comp_id from public.competitions order by created_at limit 1;
  if v_comp_id is null then
    -- competitions.created_by NOT NULL → use the admin we just made
    v_owner_id := v_admin;
    insert into public.competitions (slug, name, type, status, season, format, created_by)
    values ('demo-league', 'ליגה לדוגמה', 'league', 'draft', '2025/26', '11v11', v_owner_id)
    returning id into v_comp_id;
  end if;
  insert into public.competition_members (competition_id, user_id, role)
  values (v_comp_id, v_organiser, 'organiser')
  on conflict (competition_id, user_id) do update set role = 'organiser';

  -- 3d. viewer — no role assignments. Just an authenticated user.

  raise notice '✔ Mock users created. Login at /login with password: Test1234!';
  raise notice '  admin@test.com     → app admin';
  raise notice '  manager@test.com   → manager of team %', v_team_id;
  raise notice '  organiser@test.com → organiser of competition %', v_comp_id;
  raise notice '  viewer@test.com    → read-only';
end $$;
