'use server';

import { redirect } from 'next/navigation';
import { getSupabaseAdminClient, getSupabaseServerClient } from '@/lib/supabase/server';

// Whitelist of mock accounts we permit one-click login for.
// Anything outside this list is rejected — even with the action being callable.
const MOCK_EMAILS: Record<string, string> = {
  admin: 'admin@test.com',
  manager: 'manager@test.com',
  organiser: 'organiser@test.com',
  viewer: 'viewer@test.com',
};

export async function loginAsMock(formData: FormData) {
  const role = String(formData.get('role') ?? '');
  const email = MOCK_EMAILS[role];
  if (!email) throw new Error('invalid_mock_role');

  // 1. Admin client mints a magic-link OTP for this mock user.
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  if (error) throw new Error(error.message);
  const tokenHash = (data as any)?.properties?.hashed_token;
  if (!tokenHash) throw new Error('no_token_hash');

  // 2. SSR client redeems the OTP — this sets the auth cookies on the response.
  const supabase = getSupabaseServerClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: 'magiclink',
  });
  if (verifyError) throw new Error(verifyError.message);

  redirect('/dashboard');
}
