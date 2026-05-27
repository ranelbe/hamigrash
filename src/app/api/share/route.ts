import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getSupabaseServerClient, requireCurrentUser } from '@/lib/supabase/server';

// Create a public share link for one entity.
const schema = z.object({
  team_id: z.string().uuid().optional(),
  competition_id: z.string().uuid().optional(),
  match_id: z.string().uuid().optional(),
  player_id: z.string().uuid().optional(),
}).refine(v => Object.values(v).filter(Boolean).length === 1, { message: 'exactly_one_target' });

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const input = schema.parse(await request.json());
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.from('share_links').insert({ ...input, created_by: user.id }).select('token').single();
    if (error) throw new Error(error.message);
    const url = new URL(`/s/${data.token}`, request.nextUrl.origin).toString();
    return NextResponse.json({ ok: true, token: data.token, url });
  } catch (err: any) {
    const status = err.name === 'ZodError' ? 400 : err.message === 'not_authenticated' ? 401 : 500;
    return NextResponse.json({ ok: false, error: err.message }, { status });
  }
}
