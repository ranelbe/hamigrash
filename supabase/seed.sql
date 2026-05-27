-- ============================================================
-- HaMigrash — seed v2 / "ליגת דור הזהב"
-- WIPE existing matches/teams/players/competition, then seed:
--   10 teams (Israeli Premier League names)
--   70 players  (7 per team — 1 GK + 2 DF + 3 MF + 1 FW)
--   1 league competition
--   12 matches (5 finished w/ events, 1 live, 6 scheduled)
--
-- Idempotent. Re-run safely. Preserves profiles + app_admins.
-- ============================================================

do $$
declare
  admin_id uuid;

  comp_id  uuid := '22222222-bbbb-bbbb-bbbb-000000000010'::uuid;
  -- 10 team UUIDs
  t1  uuid := '11110001-0000-0000-0000-000000000001'::uuid;  -- מכבי תל אביב
  t2  uuid := '11110002-0000-0000-0000-000000000002'::uuid;  -- הפועל באר שבע
  t3  uuid := '11110003-0000-0000-0000-000000000003'::uuid;  -- מכבי חיפה
  t4  uuid := '11110004-0000-0000-0000-000000000004'::uuid;  -- בית"ר ירושלים
  t5  uuid := '11110005-0000-0000-0000-000000000005'::uuid;  -- הפועל תל אביב
  t6  uuid := '11110006-0000-0000-0000-000000000006'::uuid;  -- מכבי נתניה
  t7  uuid := '11110007-0000-0000-0000-000000000007'::uuid;  -- בני סכנין
  t8  uuid := '11110008-0000-0000-0000-000000000008'::uuid;  -- הפועל חיפה
  t9  uuid := '11110009-0000-0000-0000-000000000009'::uuid;  -- מ.ס. אשדוד
  t10 uuid := '11110010-0000-0000-0000-000000000010'::uuid;  -- הפועל ירושלים

  -- 12 match UUIDs
  m1  uuid := '33330001-0000-0000-0000-000000000001'::uuid;
  m2  uuid := '33330002-0000-0000-0000-000000000002'::uuid;
  m3  uuid := '33330003-0000-0000-0000-000000000003'::uuid;
  m4  uuid := '33330004-0000-0000-0000-000000000004'::uuid;
  m5  uuid := '33330005-0000-0000-0000-000000000005'::uuid;
  m6  uuid := '33330006-0000-0000-0000-000000000006'::uuid;
  m7  uuid := '33330007-0000-0000-0000-000000000007'::uuid;
  m8  uuid := '33330008-0000-0000-0000-000000000008'::uuid;
  m9  uuid := '33330009-0000-0000-0000-000000000009'::uuid;
  m10 uuid := '33330010-0000-0000-0000-000000000010'::uuid;
  m11 uuid := '33330011-0000-0000-0000-000000000011'::uuid;
  m12 uuid := '33330012-0000-0000-0000-000000000012'::uuid;
begin
  select id into admin_id from public.profiles
  where lower(email) = lower('ranelbe@gmail.com') limit 1;

  if admin_id is null then
    raise exception 'Seed aborted: log in as ranelbe@gmail.com first.';
  end if;

  -- ============== WIPE existing data ==============
  delete from public.match_events;
  delete from public.match_lineups;
  delete from public.match_officials;
  delete from public.matches;
  delete from public.competition_teams;
  delete from public.competition_members;
  delete from public.competitions;
  delete from public.players;
  delete from public.team_members;
  delete from public.teams;
  delete from public.invitations;
  delete from public.share_links;

  -- ============== TEAMS (10) ==============
  insert into public.teams (id, slug, name, short_name, primary_color, secondary_color, home_venue, created_by) values
    (t1,  'maccabi-tlv',     'מכבי תל אביב',     'מ"ת',  '#fbbf24', '#1e3a8a', 'בלומפילד',        admin_id),
    (t2,  'hapoel-bs',       'הפועל באר שבע',     'הב"ש', '#dc2626', '#ffffff', 'טרנר',           admin_id),
    (t3,  'maccabi-haifa',   'מכבי חיפה',         'מ"ח',  '#16a34a', '#ffffff', 'סמי עופר',       admin_id),
    (t4,  'beitar-jlm',      'בית"ר ירושלים',     'בית"ר','#0a0a0a', '#fbbf24', 'טדי',            admin_id),
    (t5,  'hapoel-tlv',      'הפועל תל אביב',     'הת"א', '#dc2626', '#0a0a0a', 'בלומפילד',        admin_id),
    (t6,  'maccabi-netanya', 'מכבי נתניה',         'מ"נ',  '#fde047', '#000000', 'נתניה',           admin_id),
    (t7,  'bnei-sakhnin',    'בני סכנין',          'בנ"ס', '#dc2626', '#ffffff', 'דוחא',            admin_id),
    (t8,  'hapoel-haifa',    'הפועל חיפה',         'ה"ח',  '#0e7490', '#ffffff', 'סמי עופר',        admin_id),
    (t9,  'ms-ashdod',       'מ.ס. אשדוד',         'אשדוד','#fbbf24', '#0a0a0a', 'יוד-אלף',         admin_id),
    (t10, 'hapoel-jlm',      'הפועל ירושלים',      'ה"י',  '#dc2626', '#000000', 'טדי',             admin_id)
  ;

  -- ============== PLAYERS (7 per team = 70) ==============
  -- Each block: 1 GK, 2 DF, 3 MF, 1 FW. Ratings tuned to team strength.

  -- מכבי תל אביב (strong)
  insert into public.players (team_id, display_name, squad_number, position,
    rating_pace, rating_shooting, rating_passing, rating_dribbling, rating_defending, rating_physical,
    rating_gk_diving, rating_gk_handling, rating_gk_kicking, rating_gk_reflexes, rating_gk_speed, rating_gk_positioning) values
    (t1, 'דניאל פרץ',     1,  'GK', null,null,null,null,null,null, 88,86,80,90,72,87),
    (t1, 'אנאן חלאילי',    3,  'DF', 78,55,72,68,84,82, null,null,null,null,null,null),
    (t1, 'אלון תורגמן',    4,  'DF', 76,58,74,70,86,80, null,null,null,null,null,null),
    (t1, 'דור פרץ',        8,  'MF', 82,80,86,84,68,76, null,null,null,null,null,null),
    (t1, 'מנור סולומון',   10, 'MF', 90,86,88,92,55,72, null,null,null,null,null,null),
    (t1, 'אילון אזולאי',   7,  'MF', 84,78,82,82,60,74, null,null,null,null,null,null),
    (t1, 'ערן זהבי',       9,  'FW', 86,94,80,88,45,80, null,null,null,null,null,null);

  -- הפועל באר שבע
  insert into public.players (team_id, display_name, squad_number, position,
    rating_pace, rating_shooting, rating_passing, rating_dribbling, rating_defending, rating_physical,
    rating_gk_diving, rating_gk_handling, rating_gk_kicking, rating_gk_reflexes, rating_gk_speed, rating_gk_positioning) values
    (t2, 'אופיר מרציאנו',  1,  'GK', null,null,null,null,null,null, 85,84,78,87,70,84),
    (t2, 'מיגל ויטור',     5,  'DF', 76,52,70,66,85,82, null,null,null,null,null,null),
    (t2, 'גאיוז פאוסטו',   3,  'DF', 78,55,72,68,84,80, null,null,null,null,null,null),
    (t2, 'דן ביטון',       8,  'MF', 80,78,84,82,66,74, null,null,null,null,null,null),
    (t2, 'מיגל סילבה',     10, 'MF', 86,82,86,88,58,72, null,null,null,null,null,null),
    (t2, 'אליאל פרץ',      6,  'MF', 82,76,82,80,68,76, null,null,null,null,null,null),
    (t2, 'שגיב יחזקאל',    9,  'FW', 88,90,78,88,50,78, null,null,null,null,null,null);

  -- מכבי חיפה
  insert into public.players (team_id, display_name, squad_number, position,
    rating_pace, rating_shooting, rating_passing, rating_dribbling, rating_defending, rating_physical,
    rating_gk_diving, rating_gk_handling, rating_gk_kicking, rating_gk_reflexes, rating_gk_speed, rating_gk_positioning) values
    (t3, 'יוסי כהן',       1,  'GK', null,null,null,null,null,null, 84,82,76,86,68,82),
    (t3, 'שון גולדברג',    2,  'DF', 75,55,70,65,82,80, null,null,null,null,null,null),
    (t3, 'בוגדן פלקיש',    4,  'DF', 74,52,68,62,84,82, null,null,null,null,null,null),
    (t3, 'מוחמד אבו פני',  8,  'MF', 82,78,84,82,66,74, null,null,null,null,null,null),
    (t3, 'מוחמד עואד',    10, 'MF', 85,82,86,86,56,72, null,null,null,null,null,null),
    (t3, 'דולב חזיזה',    11, 'MF', 88,80,82,86,52,70, null,null,null,null,null,null),
    (t3, 'דין דוד',        9,  'FW', 87,88,76,86,46,76, null,null,null,null,null,null);

  -- בית"ר ירושלים
  insert into public.players (team_id, display_name, squad_number, position,
    rating_pace, rating_shooting, rating_passing, rating_dribbling, rating_defending, rating_physical,
    rating_gk_diving, rating_gk_handling, rating_gk_kicking, rating_gk_reflexes, rating_gk_speed, rating_gk_positioning) values
    (t4, 'עומרי גלזר',     1,  'GK', null,null,null,null,null,null, 82,80,74,84,66,80),
    (t4, 'גיל כהן',        5,  'DF', 74,52,68,64,82,80, null,null,null,null,null,null),
    (t4, 'אדוארדו גוטמן',  3,  'DF', 72,54,70,66,84,78, null,null,null,null,null,null),
    (t4, 'יואב גרצקי',     8,  'MF', 80,76,82,80,64,72, null,null,null,null,null,null),
    (t4, 'יונס בן עזרא',  10, 'MF', 83,80,84,84,58,70, null,null,null,null,null,null),
    (t4, 'אדיר ינקו',     11, 'MF', 85,76,78,82,54,72, null,null,null,null,null,null),
    (t4, 'אסבחה הקיני',    9,  'FW', 84,86,74,82,44,78, null,null,null,null,null,null);

  -- הפועל תל אביב
  insert into public.players (team_id, display_name, squad_number, position,
    rating_pace, rating_shooting, rating_passing, rating_dribbling, rating_defending, rating_physical,
    rating_gk_diving, rating_gk_handling, rating_gk_kicking, rating_gk_reflexes, rating_gk_speed, rating_gk_positioning) values
    (t5, 'אייל גלזר',      1,  'GK', null,null,null,null,null,null, 80,78,72,82,64,78),
    (t5, 'נאתאן בית',      4,  'DF', 72,50,66,62,80,78, null,null,null,null,null,null),
    (t5, 'איתי שכטר',      3,  'DF', 74,52,68,64,82,76, null,null,null,null,null,null),
    (t5, 'אריאל הרוש',     8,  'MF', 78,74,80,78,62,70, null,null,null,null,null,null),
    (t5, 'מתן בלטקסה',    10, 'MF', 82,78,82,82,56,70, null,null,null,null,null,null),
    (t5, 'אופק בן זקן',   11, 'MF', 84,72,76,80,52,68, null,null,null,null,null,null),
    (t5, 'מנשה צרניאק',   9,  'FW', 82,84,72,80,42,74, null,null,null,null,null,null);

  -- מכבי נתניה
  insert into public.players (team_id, display_name, squad_number, position,
    rating_pace, rating_shooting, rating_passing, rating_dribbling, rating_defending, rating_physical,
    rating_gk_diving, rating_gk_handling, rating_gk_kicking, rating_gk_reflexes, rating_gk_speed, rating_gk_positioning) values
    (t6, 'אביב אלמוג',     1,  'GK', null,null,null,null,null,null, 78,76,70,80,62,76),
    (t6, 'אדם כהן',        2,  'DF', 70,50,66,60,78,76, null,null,null,null,null,null),
    (t6, 'יואב פרץ',       3,  'DF', 72,52,68,62,80,74, null,null,null,null,null,null),
    (t6, 'אסף סער',        6,  'MF', 76,72,78,76,60,68, null,null,null,null,null,null),
    (t6, 'דין דוד',        8,  'MF', 80,76,80,80,54,70, null,null,null,null,null,null),
    (t6, 'אריאל אזולאי',  10, 'MF', 82,70,74,78,50,66, null,null,null,null,null,null),
    (t6, 'אסי גלובינסקי',  9,  'FW', 80,82,70,78,40,72, null,null,null,null,null,null);

  -- בני סכנין
  insert into public.players (team_id, display_name, squad_number, position,
    rating_pace, rating_shooting, rating_passing, rating_dribbling, rating_defending, rating_physical,
    rating_gk_diving, rating_gk_handling, rating_gk_kicking, rating_gk_reflexes, rating_gk_speed, rating_gk_positioning) values
    (t7, 'אחמד גנאם',      1,  'GK', null,null,null,null,null,null, 76,74,70,78,62,75),
    (t7, 'מוחמד בארה',     2,  'DF', 70,50,66,60,78,76, null,null,null,null,null,null),
    (t7, 'איתי כהן',       4,  'DF', 72,52,68,62,80,76, null,null,null,null,null,null),
    (t7, 'איוב אבו רומי',  8,  'MF', 76,72,78,76,60,68, null,null,null,null,null,null),
    (t7, 'מוחמד פאדי',    10, 'MF', 80,76,80,80,54,68, null,null,null,null,null,null),
    (t7, 'דנילו אספריג',  11, 'MF', 82,72,74,78,52,68, null,null,null,null,null,null),
    (t7, 'אופיר דוידזדה',   9,  'FW', 80,80,70,78,42,72, null,null,null,null,null,null);

  -- הפועל חיפה
  insert into public.players (team_id, display_name, squad_number, position,
    rating_pace, rating_shooting, rating_passing, rating_dribbling, rating_defending, rating_physical,
    rating_gk_diving, rating_gk_handling, rating_gk_kicking, rating_gk_reflexes, rating_gk_speed, rating_gk_positioning) values
    (t8, 'אריאל הררי',     1,  'GK', null,null,null,null,null,null, 75,72,68,77,60,74),
    (t8, 'יותם טוטיאן',    2,  'DF', 70,50,66,60,78,74, null,null,null,null,null,null),
    (t8, 'מתן הוזז',       4,  'DF', 72,52,68,62,80,74, null,null,null,null,null,null),
    (t8, 'גילי כהן',       6,  'MF', 76,72,78,76,60,68, null,null,null,null,null,null),
    (t8, 'איתי שכטר',      8,  'MF', 78,74,78,78,54,68, null,null,null,null,null,null),
    (t8, 'יוסי בן יוסף',  10, 'MF', 80,70,74,78,50,66, null,null,null,null,null,null),
    (t8, 'יונס בן עזרא',   9,  'FW', 80,80,70,78,40,72, null,null,null,null,null,null);

  -- מ.ס. אשדוד
  insert into public.players (team_id, display_name, squad_number, position,
    rating_pace, rating_shooting, rating_passing, rating_dribbling, rating_defending, rating_physical,
    rating_gk_diving, rating_gk_handling, rating_gk_kicking, rating_gk_reflexes, rating_gk_speed, rating_gk_positioning) values
    (t9, 'אופק בן זקן',    1,  'GK', null,null,null,null,null,null, 74,72,68,76,60,72),
    (t9, 'יואב כהן',       2,  'DF', 70,50,66,60,76,74, null,null,null,null,null,null),
    (t9, 'אדם פרץ',        3,  'DF', 72,52,68,62,78,74, null,null,null,null,null,null),
    (t9, 'אביעד כהן',      6,  'MF', 74,70,76,74,58,66, null,null,null,null,null,null),
    (t9, 'גל שיש',         8,  'MF', 76,72,76,76,52,66, null,null,null,null,null,null),
    (t9, 'איתי כהן',      10, 'MF', 78,68,72,76,48,66, null,null,null,null,null,null),
    (t9, 'דין רובינשטיין',  9,  'FW', 78,78,68,76,40,70, null,null,null,null,null,null);

  -- הפועל ירושלים
  insert into public.players (team_id, display_name, squad_number, position,
    rating_pace, rating_shooting, rating_passing, rating_dribbling, rating_defending, rating_physical,
    rating_gk_diving, rating_gk_handling, rating_gk_kicking, rating_gk_reflexes, rating_gk_speed, rating_gk_positioning) values
    (t10, 'מאור גורקה',     1,  'GK', null,null,null,null,null,null, 72,70,66,74,58,70),
    (t10, 'גיל כהן',        2,  'DF', 68,48,64,58,76,72, null,null,null,null,null,null),
    (t10, 'אדם דהן',        4,  'DF', 70,50,66,60,78,72, null,null,null,null,null,null),
    (t10, 'איתי בן דוד',    6,  'MF', 72,68,74,72,56,64, null,null,null,null,null,null),
    (t10, 'אופיר אדיר',    10, 'MF', 74,70,74,74,50,64, null,null,null,null,null,null),
    (t10, 'נדב כהן',       11, 'MF', 76,66,70,74,46,64, null,null,null,null,null,null),
    (t10, 'יואב לוי',       9,  'FW', 76,76,66,74,38,68, null,null,null,null,null,null);

  -- ============== COMPETITION ==============
  insert into public.competitions (id, slug, name, type, status, format, season,
    points_win, points_draw, points_loss, rounds, has_group_stage, created_by) values
    (comp_id, 'liga-dor-hazahav', 'ליגת דור הזהב', 'league', 'active', '11v11', '2026',
     3, 1, 0, 1, false, admin_id);

  insert into public.competition_teams (competition_id, team_id) values
    (comp_id, t1), (comp_id, t2), (comp_id, t3), (comp_id, t4), (comp_id, t5),
    (comp_id, t6), (comp_id, t7), (comp_id, t8), (comp_id, t9), (comp_id, t10);

  -- ============== MATCHES (12) ==============
  insert into public.matches (id, competition_id, home_team_id, away_team_id, scheduled_at, status,
    venue, round_label, format, period_length_min, number_of_periods, finished_at, started_at, created_by) values
    -- Finished (5)
    (m1, comp_id, t1, t5, now() - interval '21 days', 'finished', 'בלומפילד',  'מחזור 1', '11v11', 45, 2, now() - interval '21 days' + interval '95 minutes', now() - interval '21 days', admin_id),
    (m2, comp_id, t2, t6, now() - interval '21 days' + interval '3 hours', 'finished', 'טרנר', 'מחזור 1', '11v11', 45, 2, now() - interval '21 days' + interval '4 hours 35 minutes', now() - interval '21 days' + interval '3 hours', admin_id),
    (m3, comp_id, t3, t9, now() - interval '14 days', 'finished', 'סמי עופר', 'מחזור 2', '11v11', 45, 2, now() - interval '14 days' + interval '95 minutes', now() - interval '14 days', admin_id),
    (m4, comp_id, t4, t7, now() - interval '14 days' + interval '3 hours', 'finished', 'טדי', 'מחזור 2', '11v11', 45, 2, now() - interval '14 days' + interval '4 hours 35 minutes', now() - interval '14 days' + interval '3 hours', admin_id),
    (m5, comp_id, t8, t10, now() - interval '7 days', 'finished', 'סמי עופר', 'מחזור 3', '11v11', 45, 2, now() - interval '7 days' + interval '95 minutes', now() - interval '7 days', admin_id),
    -- Live
    (m6, comp_id, t1, t3, now() - interval '25 minutes', 'live', 'בלומפילד', 'מחזור 4', '11v11', 45, 2, null, now() - interval '25 minutes', admin_id),
    -- Scheduled (6)
    (m7,  comp_id, t2, t4, now() + interval '2 days', 'scheduled', 'טרנר', 'מחזור 4', '11v11', 45, 2, null, null, admin_id),
    (m8,  comp_id, t5, t6, now() + interval '2 days' + interval '3 hours', 'scheduled', 'בלומפילד', 'מחזור 4', '11v11', 45, 2, null, null, admin_id),
    (m9,  comp_id, t7, t8, now() + interval '2 days' + interval '5 hours', 'scheduled', 'דוחא', 'מחזור 4', '11v11', 45, 2, null, null, admin_id),
    (m10, comp_id, t9, t10, now() + interval '2 days' + interval '7 hours', 'scheduled', 'יוד-אלף', 'מחזור 4', '11v11', 45, 2, null, null, admin_id),
    (m11, comp_id, t1, t2, now() + interval '9 days', 'scheduled', 'בלומפילד', 'מחזור 5', '11v11', 45, 2, null, null, admin_id),
    (m12, comp_id, t3, t4, now() + interval '9 days' + interval '3 hours', 'scheduled', 'סמי עופר', 'מחזור 5', '11v11', 45, 2, null, null, admin_id);

  -- ============== EVENTS for finished + live matches ==============
  -- Helper macro pattern: insert events with deterministic client_ids.

  -- M1: מכבי תל אביב 3 - 1 הפועל תל אביב
  insert into public.match_events (client_id, match_id, team_id, player_id, event_type, period, minute, payload, recorded_by) values
    ('99990001-0000-0000-0000-000000000001'::uuid, m1, t1, (select id from public.players where team_id = t1 and display_name = 'ערן זהבי'),       'goal', 1, 12, '{"seed":true}', admin_id),
    ('99990001-0000-0000-0000-000000000002'::uuid, m1, t1, (select id from public.players where team_id = t1 and display_name = 'מנור סולומון'),   'goal', 1, 28, '{"seed":true}', admin_id),
    ('99990001-0000-0000-0000-000000000003'::uuid, m1, t5, (select id from public.players where team_id = t5 and display_name = 'מנשה צרניאק'),  'goal', 2, 56, '{"seed":true}', admin_id),
    ('99990001-0000-0000-0000-000000000004'::uuid, m1, t1, (select id from public.players where team_id = t1 and display_name = 'ערן זהבי'),       'goal', 2, 72, '{"seed":true}', admin_id),
    ('99990001-0000-0000-0000-000000000005'::uuid, m1, t5, (select id from public.players where team_id = t5 and display_name = 'איתי שכטר'),     'yellow_card', 2, 68, '{"seed":true}', admin_id);

  -- M2: הפועל באר שבע 2 - 2 מכבי נתניה
  insert into public.match_events (client_id, match_id, team_id, player_id, event_type, period, minute, payload, recorded_by) values
    ('99990002-0000-0000-0000-000000000001'::uuid, m2, t2, (select id from public.players where team_id = t2 and display_name = 'שגיב יחזקאל'),  'goal', 1, 8,  '{"seed":true}', admin_id),
    ('99990002-0000-0000-0000-000000000002'::uuid, m2, t6, (select id from public.players where team_id = t6 and display_name = 'אסי גלובינסקי'),'goal', 1, 35, '{"seed":true}', admin_id),
    ('99990002-0000-0000-0000-000000000003'::uuid, m2, t2, (select id from public.players where team_id = t2 and display_name = 'מיגל סילבה'),  'goal', 2, 61, '{"seed":true}', admin_id),
    ('99990002-0000-0000-0000-000000000004'::uuid, m2, t6, (select id from public.players where team_id = t6 and display_name = 'דין דוד'),     'goal', 2, 88, '{"seed":true}', admin_id);

  -- M3: מכבי חיפה 4 - 0 מ.ס. אשדוד
  insert into public.match_events (client_id, match_id, team_id, player_id, event_type, period, minute, payload, recorded_by) values
    ('99990003-0000-0000-0000-000000000001'::uuid, m3, t3, (select id from public.players where team_id = t3 and display_name = 'דין דוד'),      'goal', 1, 17, '{"seed":true}', admin_id),
    ('99990003-0000-0000-0000-000000000002'::uuid, m3, t3, (select id from public.players where team_id = t3 and display_name = 'דולב חזיזה'),   'goal', 1, 31, '{"seed":true}', admin_id),
    ('99990003-0000-0000-0000-000000000003'::uuid, m3, t3, (select id from public.players where team_id = t3 and display_name = 'דין דוד'),      'goal', 2, 52, '{"seed":true}', admin_id),
    ('99990003-0000-0000-0000-000000000004'::uuid, m3, t3, (select id from public.players where team_id = t3 and display_name = 'מוחמד עואד'),  'goal', 2, 78, '{"seed":true}', admin_id);

  -- M4: בית"ר ירושלים 2 - 1 בני סכנין
  insert into public.match_events (client_id, match_id, team_id, player_id, event_type, period, minute, payload, recorded_by) values
    ('99990004-0000-0000-0000-000000000001'::uuid, m4, t4, (select id from public.players where team_id = t4 and display_name = 'אסבחה הקיני'),  'goal', 1, 22, '{"seed":true}', admin_id),
    ('99990004-0000-0000-0000-000000000002'::uuid, m4, t7, (select id from public.players where team_id = t7 and display_name = 'אופיר דוידזדה'),'goal', 2, 50, '{"seed":true}', admin_id),
    ('99990004-0000-0000-0000-000000000003'::uuid, m4, t4, (select id from public.players where team_id = t4 and display_name = 'אדיר ינקו'),    'goal', 2, 81, '{"seed":true}', admin_id);

  -- M5: הפועל חיפה 1 - 1 הפועל ירושלים
  insert into public.match_events (client_id, match_id, team_id, player_id, event_type, period, minute, payload, recorded_by) values
    ('99990005-0000-0000-0000-000000000001'::uuid, m5, t8, (select id from public.players where team_id = t8 and display_name = 'יונס בן עזרא'), 'goal', 1, 33, '{"seed":true}', admin_id),
    ('99990005-0000-0000-0000-000000000002'::uuid, m5, t10, (select id from public.players where team_id = t10 and display_name = 'יואב לוי'),   'goal', 2, 73, '{"seed":true}', admin_id);

  -- M6 LIVE: מכבי תל אביב 1 - 0 מכבי חיפה (in progress)
  insert into public.match_events (client_id, match_id, team_id, player_id, event_type, period, minute, payload, recorded_by) values
    ('99990006-0000-0000-0000-000000000001'::uuid, m6, t1, (select id from public.players where team_id = t1 and display_name = 'מנור סולומון'), 'goal', 1, 18, '{"seed":true}', admin_id),
    ('99990006-0000-0000-0000-000000000002'::uuid, m6, t3, (select id from public.players where team_id = t3 and display_name = 'דולב חזיזה'),   'yellow_card', 1, 22, '{"seed":true}', admin_id);

  raise notice 'Seed v2 done. 10 teams, 70 players, 12 matches (5 finished, 1 live, 6 scheduled).';
end $$;
