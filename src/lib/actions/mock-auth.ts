'use server';

import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';

// Whitelist of mock accounts we permit one-click login for.
const MOCK_EMAILS: Record<string, string> = {
  admin: 'admin@test.com',
  manager: 'manager@test.com',
  organiser: 'organiser@test.com',
  viewer: 'viewer@test.com',
};

// Shared password set by supabase/seed-mock-users.sql. The user never types
// or sees this — it's hard-coded so one click logs them in cleanly.
const MOCK_PASSWORD = 'Test1234!';

export async function loginAsMock(formData: FormData) {
  const role = String(formData.get('role') ?? '');
  const email = MOCK_EMAILS[role];
  if (!email) throw new Error('invalid_mock_role');

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: MOCK_PASSWORD,
  });
  if (error) {
    // Surface the real reason so we don't get an opaque "Application error" page.
    throw new Error(`mock_login_failed: ${error.message}`);
  }

  redirect('/dashboard');
}
