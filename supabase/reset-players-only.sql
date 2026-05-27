-- ============================================================
-- HaMigrash — RESET + 70 players in one "free agents" team
-- Goal: pool of 70 players ready to be split by the balancer.
-- Preserves: profiles, app_admins, training_groups.
-- Adds a random training_group_id (1 of 4) to each player.
-- ============================================================

do $$
declare
  admin_id uuid;
  pool_id  uuid := '11110000-0000-0000-0000-000000000001'::uuid;
begin
  select id into admin_id from public.profiles
  where lower(email) = lower('ranelbe@gmail.com') limit 1;
  if admin_id is null then raise exception 'Log in first as ranelbe@gmail.com'; end if;

  -- WIPE matches/teams/players (training_groups are kept — they're catalogue data)
  delete from public.match_events;
  delete from public.match_lineups;
  delete from public.match_officials;
  delete from public.matches;
  delete from public.competition_teams;
  delete from public.competition_members;
  delete from public.competitions;
  delete from public.players;
  delete from public.team_members;
  delete from public.invitations;
  delete from public.share_links;
  delete from public.teams;

  -- Ensure the 4 expected training groups exist (idempotent — no-op if already there).
  insert into public.training_groups (name, created_by)
  values ('בקעה 1', admin_id), ('בקעה 2', admin_id), ('מבט', admin_id), ('קשת', admin_id)
  on conflict (name) do nothing;

  -- Single pool team
  insert into public.teams (id, slug, name, short_name, primary_color, secondary_color, home_venue, crest_shape, created_by) values
    (pool_id, 'free-agents', 'שחקנים חופשיים', 'שח', '#475569', '#0f172a', null, 'circle', admin_id);

  -- ========================================
  -- 70 players — varied stats and positions
  -- Distribution: 10 GK · 20 DF · 25 MF · 15 FW
  -- Skill spread: 5 superstars · 15 strong · 30 solid · 20 developing
  -- ========================================
  insert into public.players (team_id, display_name, squad_number, position,
    rating_pace, rating_shooting, rating_passing, rating_dribbling, rating_defending, rating_physical,
    rating_gk_diving, rating_gk_handling, rating_gk_kicking, rating_gk_reflexes, rating_gk_speed, rating_gk_positioning) values

  -- ====== Goalkeepers (10) ======
  (pool_id, 'דניאל פרץ',    1,  'GK', null,null,null,null,null,null, 94,92,86,95,76,93),
  (pool_id, 'אופיר מרציאנו',2,  'GK', null,null,null,null,null,null, 89,88,82,91,74,88),
  (pool_id, 'יוסי כהן',     3,  'GK', null,null,null,null,null,null, 86,84,78,87,70,85),
  (pool_id, 'עומרי גלזר',   4,  'GK', null,null,null,null,null,null, 82,80,74,84,66,80),
  (pool_id, 'אריאל הררי',   5,  'GK', null,null,null,null,null,null, 78,76,72,80,64,77),
  (pool_id, 'אייל גלזר',    6,  'GK', null,null,null,null,null,null, 76,74,70,78,62,75),
  (pool_id, 'מאור גורקה',   7,  'GK', null,null,null,null,null,null, 72,70,66,74,60,72),
  (pool_id, 'אביב אלמוג',   8,  'GK', null,null,null,null,null,null, 68,66,64,70,58,68),
  (pool_id, 'אחמד גנאם',    9,  'GK', null,null,null,null,null,null, 64,62,60,66,54,63),
  (pool_id, 'נער השער',    10,  'GK', null,null,null,null,null,null, 56,54,52,58,50,56),

  -- ====== Defenders (20) ======
  (pool_id, 'אנאן חלאילי',     11, 'DF', 80,58,76,72,90,88, null,null,null,null,null,null),
  (pool_id, 'אלון תורגמן',     12, 'DF', 78,60,76,72,90,86, null,null,null,null,null,null),
  (pool_id, 'מיגל ויטור',      13, 'DF', 79,54,73,69,89,86, null,null,null,null,null,null),
  (pool_id, 'גאיוז פאוסטו',    14, 'DF', 81,58,75,71,88,84, null,null,null,null,null,null),
  (pool_id, 'בוגדן פלקיש',     15, 'DF', 77,55,71,65,87,86, null,null,null,null,null,null),
  (pool_id, 'שון גולדברג',     16, 'DF', 78,58,73,68,85,82, null,null,null,null,null,null),
  (pool_id, 'אדוארדו גוטמן',   17, 'DF', 74,57,73,69,84,80, null,null,null,null,null,null),
  (pool_id, 'גיל כהן',         18, 'DF', 76,55,71,67,82,80, null,null,null,null,null,null),
  (pool_id, 'איתי שכטר',       19, 'DF', 76,54,70,66,82,78, null,null,null,null,null,null),
  (pool_id, 'נאתאן בית',       20, 'DF', 74,52,68,64,80,78, null,null,null,null,null,null),
  (pool_id, 'אדם כהן',         21, 'DF', 72,52,68,62,78,76, null,null,null,null,null,null),
  (pool_id, 'יואב פרץ',        22, 'DF', 74,54,70,64,80,74, null,null,null,null,null,null),
  (pool_id, 'מוחמד בארה',      23, 'DF', 72,52,68,62,78,74, null,null,null,null,null,null),
  (pool_id, 'איתי כהן ב׳',     24, 'DF', 74,54,70,64,78,72, null,null,null,null,null,null),
  (pool_id, 'יותם טוטיאן',     25, 'DF', 70,50,66,60,76,72, null,null,null,null,null,null),
  (pool_id, 'מתן הוזז',        26, 'DF', 72,52,68,62,76,70, null,null,null,null,null,null),
  (pool_id, 'יואב ל׳',          27, 'DF', 68,48,64,58,74,68, null,null,null,null,null,null),
  (pool_id, 'אדם דהן',         28, 'DF', 70,50,66,60,72,66, null,null,null,null,null,null),
  (pool_id, 'אורי גרין',       29, 'DF', 66,46,62,56,68,64, null,null,null,null,null,null),
  (pool_id, 'נער מגננה',        30, 'DF', 62,42,58,52,64,60, null,null,null,null,null,null),

  -- ====== Midfielders (25) ======
  (pool_id, 'מנור סולומון',   31, 'MF', 94,90,93,96,58,76, null,null,null,null,null,null),
  (pool_id, 'מיגל סילבה',     32, 'MF', 90,86,91,92,62,76, null,null,null,null,null,null),
  (pool_id, 'מוחמד עואד',     33, 'MF', 89,86,90,90,60,76, null,null,null,null,null,null),
  (pool_id, 'דור פרץ',        34, 'MF', 86,84,90,88,72,80, null,null,null,null,null,null),
  (pool_id, 'אילון אזולאי',   35, 'MF', 88,82,86,86,64,78, null,null,null,null,null,null),
  (pool_id, 'מוחמד אבו פני',  36, 'MF', 85,82,88,86,70,78, null,null,null,null,null,null),
  (pool_id, 'דולב חזיזה',     37, 'MF', 92,84,86,90,56,74, null,null,null,null,null,null),
  (pool_id, 'דן ביטון',       38, 'MF', 84,82,88,86,70,78, null,null,null,null,null,null),
  (pool_id, 'אליאל פרץ',      39, 'MF', 85,79,86,83,72,79, null,null,null,null,null,null),
  (pool_id, 'יונס בן עזרא',   40, 'MF', 86,82,86,86,60,72, null,null,null,null,null,null),
  (pool_id, 'אדיר ינקו',      41, 'MF', 87,78,80,84,56,74, null,null,null,null,null,null),
  (pool_id, 'יואב גרצקי',     42, 'MF', 82,78,84,82,66,74, null,null,null,null,null,null),
  (pool_id, 'אריאל הרוש',     43, 'MF', 80,76,82,80,64,72, null,null,null,null,null,null),
  (pool_id, 'מתן בלטקסה',     44, 'MF', 84,80,84,84,58,72, null,null,null,null,null,null),
  (pool_id, 'אופק בן זקן',    45, 'MF', 86,74,78,82,54,70, null,null,null,null,null,null),
  (pool_id, 'אסף סער',        46, 'MF', 78,74,80,78,62,70, null,null,null,null,null,null),
  (pool_id, 'דין דוד נתניה',  47, 'MF', 82,78,82,82,56,72, null,null,null,null,null,null),
  (pool_id, 'אריאל אזולאי',   48, 'MF', 84,72,76,80,52,68, null,null,null,null,null,null),
  (pool_id, 'איוב אבו רומי',  49, 'MF', 78,74,80,78,62,70, null,null,null,null,null,null),
  (pool_id, 'מוחמד פאדי',     50, 'MF', 82,78,82,82,56,70, null,null,null,null,null,null),
  (pool_id, 'דנילו אספריג',   51, 'MF', 84,74,76,80,54,70, null,null,null,null,null,null),
  (pool_id, 'גילי כהן',       52, 'MF', 78,74,80,78,62,70, null,null,null,null,null,null),
  (pool_id, 'יוסי בן יוסף',   53, 'MF', 82,72,76,80,52,68, null,null,null,null,null,null),
  (pool_id, 'אופיר אדיר',     54, 'MF', 76,72,76,76,52,66, null,null,null,null,null,null),
  (pool_id, 'נדב כהן',        55, 'MF', 72,68,72,72,48,64, null,null,null,null,null,null),

  -- ====== Forwards (15) ======
  (pool_id, 'ערן זהבי',         56, 'FW', 90,98,84,92,48,84, null,null,null,null,null,null),
  (pool_id, 'דין דוד',          57, 'FW', 91,92,80,90,50,80, null,null,null,null,null,null),
  (pool_id, 'שגיב יחזקאל',      58, 'FW', 91,93,82,91,54,82, null,null,null,null,null,null),
  (pool_id, 'אסבחה הקיני',      59, 'FW', 87,89,76,84,46,80, null,null,null,null,null,null),
  (pool_id, 'מנשה צרניאק',      60, 'FW', 84,86,74,82,44,76, null,null,null,null,null,null),
  (pool_id, 'אסי גלובינסקי',    61, 'FW', 82,84,72,80,42,74, null,null,null,null,null,null),
  (pool_id, 'אופיר דוידזדה',    62, 'FW', 82,82,72,80,44,74, null,null,null,null,null,null),
  (pool_id, 'יונס בן עזרא חיפה',63, 'FW', 82,82,72,80,42,74, null,null,null,null,null,null),
  (pool_id, 'דין רובינשטיין',   64, 'FW', 80,80,70,78,42,72, null,null,null,null,null,null),
  (pool_id, 'יואב לוי',         65, 'FW', 78,78,68,76,40,70, null,null,null,null,null,null),
  (pool_id, 'גיל ביטון',        66, 'FW', 88,86,72,82,40,75, null,null,null,null,null,null),
  (pool_id, 'יהונתן שמש',       67, 'FW', 85,88,72,78,40,78, null,null,null,null,null,null),
  (pool_id, 'יהב מזרחי',        68, 'FW', 86,80,68,82,42,72, null,null,null,null,null,null),
  (pool_id, 'דביר אביטל',       69, 'FW', 90,88,72,86,38,78, null,null,null,null,null,null),
  (pool_id, 'נער חלוץ',          70, 'FW', 74,72,64,70,38,66, null,null,null,null,null,null);

  -- ========================================
  -- Random training group assignment (per-row).
  -- Shuffle players randomly, then assign by modulo so each group gets
  -- ~equal share. Subqueries with `order by random()` get evaluated only
  -- once when not correlated, so we use row_number() over (order by random())
  -- inside a CTE to guarantee per-row randomness.
  -- ========================================
  with shuffled as (
    select id, row_number() over (order by random()) as rn
    from public.players
    where team_id = pool_id
  ),
  grps as (
    select id, row_number() over (order by name) as rn
    from public.training_groups
    where name in ('בקעה 1', 'בקעה 2', 'מבט', 'קשת')
  ),
  gcount as (select count(*) as n from grps)
  update public.players p
  set training_group_id = g.id
  from shuffled s, grps g, gcount
  where p.id = s.id
    and g.rn = ((s.rn - 1) % gcount.n) + 1;

  raise notice 'Done: 70 players in pool "שחקנים חופשיים", each assigned to one of 4 training groups.';
end $$;
