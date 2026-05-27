import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

// One-shot endpoint: ensures 4 mock users exist with the right roles.
// Idempotent — deletes any previous mock users by email (which also rolls
// up cascading FKs via auth.users → public.profiles → memberships) and
// recreates them via Supabase Admin API so the auth.users rows match
// whatever GoTrue version is in production.
//
// This is intentionally unauthenticated because:
//   (a) the input is fixed — no user-controlled fields,
//   (b) the created users have known credentials so anyone could log in
//       as them anyway via the login page mock buttons,
//   (c) it's a dev convenience that should be removed before going public.

const MOCK_USERS = [
  { key: 'admin',     email: 'admin@test.com',     full_name: 'אדמין בדיקה' },
  { key: 'manager',   email: 'manager@test.com',   full_name: 'מנהל קבוצה' },
  { key: 'organiser', email: 'organiser@test.com', full_name: 'מארגן תחרות' },
  { key: 'viewer',    email: 'viewer@test.com',    full_name: 'צופה רגיל' },
] as const;

const MOCK_PASSWORD = 'Test1234!';

export async function POST() {
  try {
    const admin = getSupabaseAdminClient();

    // 1. Wipe any existing mock users (paginate to be safe).
    //    deleteUser cascades to public.profiles and all memberships.
    let page = 1;
    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) return NextResponse.json({ error: `listUsers: ${error.message}` }, { status: 500 });
      for (const u of data?.users ?? []) {
        if (MOCK_USERS.some(m => m.email === u.email)) {
          await admin.auth.admin.deleteUser(u.id);
        }
      }
      if (!data || data.users.length < 200) break;
      page += 1;
    }

    // 2. Create the 4 mock users with email pre-confirmed.
    const ids: Record<string, string> = {};
    for (const m of MOCK_USERS) {
      const { data, error } = await admin.auth.admin.createUser({
        email: m.email,
        password: MOCK_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: m.full_name },
      });
      if (error || !data.user) {
        return NextResponse.json({ error: `createUser ${m.email}: ${error?.message ?? 'unknown'}` }, { status: 500 });
      }
      ids[m.key] = data.user.id;
    }

    // 3. Patch full_name in profiles (the on_auth_user_created trigger
    //    already created the rows but may have dropped the metadata field).
    for (const m of MOCK_USERS) {
      await admin.from('profiles').update({ full_name: m.full_name }).eq('id', ids[m.key]);
    }

    // 4. Assign roles.
    // 4a. App admin flag (bypasses RLS).
    await admin.from('app_admins').upsert({ user_id: ids.admin });

    // 4a-bonus: Add the mock admin as manager of EVERY team and organiser
    // of EVERY competition. The real owner of the app naturally ends up
    // there because they created those rows (creating a team adds the
    // creator as a team_member). Mirroring that gives the mock admin
    // the same dashboard view ("בניהול שלי" lists everything).
    const { data: allTeams } = await admin.from('teams').select('id');
    if (allTeams?.length) {
      await admin.from('team_members').upsert(
        allTeams.map(t => ({ team_id: t.id, user_id: ids.admin, role: 'manager' })),
        { onConflict: 'team_id,user_id' },
      );
    }
    const { data: allCompsForAdmin } = await admin.from('competitions').select('id');
    if (allCompsForAdmin?.length) {
      await admin.from('competition_members').upsert(
        allCompsForAdmin.map(c => ({ competition_id: c.id, user_id: ids.admin, role: 'organiser' })),
        { onConflict: 'competition_id,user_id' },
      );
    }

    // 4b. Team manager — pick first non-pool team
    const { data: teams } = await admin
      .from('teams')
      .select('id, name')
      .neq('name', 'שחקנים חופשיים')
      .order('created_at')
      .limit(1);
    const teamId = teams?.[0]?.id
      ?? (await admin.from('teams').select('id').order('created_at').limit(1)).data?.[0]?.id;
    if (teamId) {
      await admin.from('team_members').upsert(
        { team_id: teamId, user_id: ids.manager, role: 'manager' },
        { onConflict: 'team_id,user_id' },
      );
    }

    // 4c. Competition organiser — pick first competition or create one
    let { data: comps } = await admin.from('competitions').select('id').order('created_at').limit(1);
    let compId = comps?.[0]?.id;
    if (!compId) {
      const { data: created, error: cErr } = await admin.from('competitions').insert({
        slug: 'demo-league',
        name: 'ליגה לדוגמה',
        type: 'league',
        status: 'draft',
        season: '2025/26',
        format: '11v11',
        created_by: ids.admin,
      }).select('id').single();
      if (cErr) return NextResponse.json({ error: `create competition: ${cErr.message}` }, { status: 500 });
      compId = created!.id;
    }
    await admin.from('competition_members').upsert(
      { competition_id: compId, user_id: ids.organiser, role: 'organiser' },
      { onConflict: 'competition_id,user_id' },
    );

    return NextResponse.json({
      ok: true,
      users: MOCK_USERS.map(m => ({ email: m.email, id: ids[m.key] })),
      team_id: teamId,
      competition_id: compId,
    });
  } catch (e: any) {
    return NextResponse.json({ error: `unhandled: ${e?.message ?? String(e)}` }, { status: 500 });
  }
}
