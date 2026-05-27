-- ============================================================
-- HaMigrash — RESET + 10 teams + 70 players (no competition)
-- Preserves: profiles, app_admins.
-- ============================================================

do $$
declare
  admin_id uuid;
  t1  uuid := '11110001-0000-0000-0000-000000000001'::uuid;
  t2  uuid := '11110002-0000-0000-0000-000000000002'::uuid;
  t3  uuid := '11110003-0000-0000-0000-000000000003'::uuid;
  t4  uuid := '11110004-0000-0000-0000-000000000004'::uuid;
  t5  uuid := '11110005-0000-0000-0000-000000000005'::uuid;
  t6  uuid := '11110006-0000-0000-0000-000000000006'::uuid;
  t7  uuid := '11110007-0000-0000-0000-000000000007'::uuid;
  t8  uuid := '11110008-0000-0000-0000-000000000008'::uuid;
  t9  uuid := '11110009-0000-0000-0000-000000000009'::uuid;
  t10 uuid := '11110010-0000-0000-0000-000000000010'::uuid;
begin
  select id into admin_id from public.profiles
  where lower(email) = lower('ranelbe@gmail.com') limit 1;
  if admin_id is null then
    raise exception 'Log in once with ranelbe@gmail.com first.';
  end if;

  -- ============== WIPE ==============
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

  -- ============== TEAMS (10) ==============
  insert into public.teams (id, slug, name, short_name, primary_color, secondary_color, home_venue, crest_shape, created_by) values
    (t1,  'maccabi-tlv',     'מכבי תל אביב',      'מ"ת',  '#fbbf24', '#1e3a8a', 'בלומפילד',       'shield',  admin_id),
    (t2,  'hapoel-bs',       'הפועל באר שבע',     'הב"ש', '#dc2626', '#ffffff', 'טרנר',           'hexagon', admin_id),
    (t3,  'maccabi-haifa',   'מכבי חיפה',          'מ"ח',  '#16a34a', '#ffffff', 'סמי עופר',       'shield',  admin_id),
    (t4,  'beitar-jlm',      'בית"ר ירושלים',      'בית"ר','#0a0a0a', '#fbbf24', 'טדי',            'hexagon', admin_id),
    (t5,  'hapoel-tlv',      'הפועל תל אביב',      'הת"א', '#dc2626', '#0a0a0a', 'בלומפילד',       'circle',  admin_id),
    (t6,  'maccabi-netanya', 'מכבי נתניה',         'מ"נ',  '#fde047', '#000000', 'נתניה',          'hexagon', admin_id),
    (t7,  'bnei-sakhnin',    'בני סכנין',          'בנ"ס', '#dc2626', '#ffffff', 'דוחא',           'shield',  admin_id),
    (t8,  'hapoel-haifa',    'הפועל חיפה',         'ה"ח',  '#0e7490', '#ffffff', 'סמי עופר',       'circle',  admin_id),
    (t9,  'ms-ashdod',       'מ.ס. אשדוד',         'אשדוד','#fbbf24', '#0a0a0a', 'יוד-אלף',        'pentagon',admin_id),
    (t10, 'hapoel-jlm',      'הפועל ירושלים',      'ה"י',  '#dc2626', '#000000', 'טדי',            'diamond', admin_id);

  -- ============== PLAYERS (7 per team = 70) ==============
  -- Stats spread: stars (~90 OVR), regulars (~75), young/role players (~60).
  -- Each team: 1 GK + 2 DF + 3 MF + 1 FW.

  insert into public.players (team_id, display_name, squad_number, position,
    rating_pace, rating_shooting, rating_passing, rating_dribbling, rating_defending, rating_physical,
    rating_gk_diving, rating_gk_handling, rating_gk_kicking, rating_gk_reflexes, rating_gk_speed, rating_gk_positioning) values
  -- מכבי תל אביב (top tier)
  (t1, 'דניאל פרץ',     1,  'GK', null,null,null,null,null,null, 92,90,84,94,76,91),
  (t1, 'אנאן חלאילי',    3,  'DF', 80,58,76,72,88,86, null,null,null,null,null,null),
  (t1, 'אלון תורגמן',    4,  'DF', 78,60,76,72,90,84, null,null,null,null,null,null),
  (t1, 'דור פרץ',        8,  'MF', 86,84,90,88,72,80, null,null,null,null,null,null),
  (t1, 'מנור סולומון',   10, 'MF', 94,90,92,96,58,76, null,null,null,null,null,null),
  (t1, 'אילון אזולאי',   7,  'MF', 88,82,86,86,64,78, null,null,null,null,null,null),
  (t1, 'ערן זהבי',       9,  'FW', 90,98,84,92,48,84, null,null,null,null,null,null),

  -- הפועל באר שבע (top tier)
  (t2, 'אופיר מרציאנו',  1,  'GK', null,null,null,null,null,null, 89,88,82,91,74,88),
  (t2, 'מיגל ויטור',     5,  'DF', 79,54,73,69,88,85, null,null,null,null,null,null),
  (t2, 'גאיוז פאוסטו',   3,  'DF', 81,58,75,71,87,83, null,null,null,null,null,null),
  (t2, 'דן ביטון',       8,  'MF', 84,82,88,86,70,78, null,null,null,null,null,null),
  (t2, 'מיגל סילבה',     10, 'MF', 90,86,90,92,62,76, null,null,null,null,null,null),
  (t2, 'אליאל פרץ',      6,  'MF', 85,79,86,83,72,79, null,null,null,null,null,null),
  (t2, 'שגיב יחזקאל',    9,  'FW', 91,93,82,91,54,82, null,null,null,null,null,null),

  -- מכבי חיפה (top tier)
  (t3, 'יוסי כהן',       1,  'GK', null,null,null,null,null,null, 88,86,80,90,72,86),
  (t3, 'שון גולדברג',    2,  'DF', 78,58,73,68,86,84, null,null,null,null,null,null),
  (t3, 'בוגדן פלקיש',    4,  'DF', 77,55,71,65,88,86, null,null,null,null,null,null),
  (t3, 'מוחמד אבו פני',  8,  'MF', 85,82,88,86,70,78, null,null,null,null,null,null),
  (t3, 'מוחמד עואד',    10, 'MF', 89,86,90,90,60,76, null,null,null,null,null,null),
  (t3, 'דולב חזיזה',    11, 'MF', 92,84,86,90,56,74, null,null,null,null,null,null),
  (t3, 'דין דוד',        9,  'FW', 91,92,80,90,50,80, null,null,null,null,null,null),

  -- בית"ר ירושלים (mid-top tier)
  (t4, 'עומרי גלזר',     1,  'GK', null,null,null,null,null,null, 85,83,77,87,69,83),
  (t4, 'גיל כהן',        5,  'DF', 76,55,71,67,84,82, null,null,null,null,null,null),
  (t4, 'אדוארדו גוטמן',  3,  'DF', 74,57,73,69,86,80, null,null,null,null,null,null),
  (t4, 'יואב גרצקי',     8,  'MF', 82,78,84,82,66,74, null,null,null,null,null,null),
  (t4, 'יונס בן עזרא',  10, 'MF', 86,82,86,86,60,72, null,null,null,null,null,null),
  (t4, 'אדיר ינקו',     11, 'MF', 87,78,80,84,56,74, null,null,null,null,null,null),
  (t4, 'אסבחה הקיני',    9,  'FW', 87,89,76,84,46,80, null,null,null,null,null,null),

  -- הפועל תל אביב (mid tier)
  (t5, 'אייל גלזר',      1,  'GK', null,null,null,null,null,null, 82,80,74,84,66,80),
  (t5, 'נאתאן בית',      4,  'DF', 74,52,68,64,82,80, null,null,null,null,null,null),
  (t5, 'איתי שכטר',      3,  'DF', 76,54,70,66,84,78, null,null,null,null,null,null),
  (t5, 'אריאל הרוש',     8,  'MF', 80,76,82,80,64,72, null,null,null,null,null,null),
  (t5, 'מתן בלטקסה',    10, 'MF', 84,80,84,84,58,72, null,null,null,null,null,null),
  (t5, 'אופק בן זקן',   11, 'MF', 86,74,78,82,54,70, null,null,null,null,null,null),
  (t5, 'מנשה צרניאק',   9,  'FW', 84,86,74,82,44,76, null,null,null,null,null,null),

  -- מכבי נתניה (mid tier)
  (t6, 'אביב אלמוג',     1,  'GK', null,null,null,null,null,null, 80,78,72,82,64,78),
  (t6, 'אדם כהן',        2,  'DF', 72,52,68,62,80,78, null,null,null,null,null,null),
  (t6, 'יואב פרץ',       3,  'DF', 74,54,70,64,82,76, null,null,null,null,null,null),
  (t6, 'אסף סער',        6,  'MF', 78,74,80,78,62,70, null,null,null,null,null,null),
  (t6, 'דין דוד נתניה',  8,  'MF', 82,78,82,82,56,72, null,null,null,null,null,null),
  (t6, 'אריאל אזולאי',  10, 'MF', 84,72,76,80,52,68, null,null,null,null,null,null),
  (t6, 'אסי גלובינסקי',  9,  'FW', 82,84,72,80,42,74, null,null,null,null,null,null),

  -- בני סכנין (mid-lower tier)
  (t7, 'אחמד גנאם',      1,  'GK', null,null,null,null,null,null, 78,76,72,80,64,77),
  (t7, 'מוחמד בארה',     2,  'DF', 72,52,68,62,80,78, null,null,null,null,null,null),
  (t7, 'איתי כהן',       4,  'DF', 74,54,70,64,82,78, null,null,null,null,null,null),
  (t7, 'איוב אבו רומי',  8,  'MF', 78,74,80,78,62,70, null,null,null,null,null,null),
  (t7, 'מוחמד פאדי',    10, 'MF', 82,78,82,82,56,70, null,null,null,null,null,null),
  (t7, 'דנילו אספריג',  11, 'MF', 84,74,76,80,54,70, null,null,null,null,null,null),
  (t7, 'אופיר דוידזדה',  9,  'FW', 82,82,72,80,44,74, null,null,null,null,null,null),

  -- הפועל חיפה (lower-mid tier)
  (t8, 'אריאל הררי',     1,  'GK', null,null,null,null,null,null, 77,74,70,79,62,76),
  (t8, 'יותם טוטיאן',    2,  'DF', 72,52,68,62,80,76, null,null,null,null,null,null),
  (t8, 'מתן הוזז',       4,  'DF', 74,54,70,64,82,76, null,null,null,null,null,null),
  (t8, 'גילי כהן',       6,  'MF', 78,74,80,78,62,70, null,null,null,null,null,null),
  (t8, 'איתי שכטר חיפה', 8,  'MF', 80,76,80,80,56,70, null,null,null,null,null,null),
  (t8, 'יוסי בן יוסף',  10, 'MF', 82,72,76,80,52,68, null,null,null,null,null,null),
  (t8, 'יונס בן עזרא חיפה',9, 'FW', 82,82,72,80,42,74, null,null,null,null,null,null),

  -- מ.ס. אשדוד (lower tier)
  (t9, 'אופק בן זקן GK', 1,  'GK', null,null,null,null,null,null, 76,74,70,78,62,74),
  (t9, 'יואב כהן אשדוד', 2,  'DF', 72,52,68,62,78,76, null,null,null,null,null,null),
  (t9, 'אדם פרץ אשדוד',  3,  'DF', 74,54,70,64,80,76, null,null,null,null,null,null),
  (t9, 'אביעד כהן',      6,  'MF', 76,72,78,76,60,68, null,null,null,null,null,null),
  (t9, 'גל שיש',         8,  'MF', 78,74,78,78,54,68, null,null,null,null,null,null),
  (t9, 'איתי כהן אשדוד', 10, 'MF', 80,70,74,78,50,68, null,null,null,null,null,null),
  (t9, 'דין רובינשטיין', 9,  'FW', 80,80,70,78,42,72, null,null,null,null,null,null),

  -- הפועל ירושלים (lower tier)
  (t10, 'מאור גורקה',     1,  'GK', null,null,null,null,null,null, 74,72,68,76,60,72),
  (t10, 'גיל כהן ירושלים',2,  'DF', 70,50,66,60,78,74, null,null,null,null,null,null),
  (t10, 'אדם דהן',        4,  'DF', 72,52,68,62,80,74, null,null,null,null,null,null),
  (t10, 'איתי בן דוד',    6,  'MF', 74,70,76,74,58,66, null,null,null,null,null,null),
  (t10, 'אופיר אדיר',    10, 'MF', 76,72,76,76,52,66, null,null,null,null,null,null),
  (t10, 'נדב כהן',       11, 'MF', 78,68,72,76,48,66, null,null,null,null,null,null),
  (t10, 'יואב לוי',       9,  'FW', 78,78,68,76,40,70, null,null,null,null,null,null);

  raise notice 'Done: 10 teams + 70 players. No competition/matches. Go play.';
end $$;
