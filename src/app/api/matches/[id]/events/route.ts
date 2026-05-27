import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { matchEventSchema } from '@/lib/schemas';
import { recordMatchEvent } from '@/lib/actions/matches';
import { getSupabaseServerClient } from '@/lib/supabase/server';

// Batch endpoint used by the offline queue when coming back online.
const batchSchema = z.object({
  events: z.array(matchEventSchema).min(1).max(200),
});

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { events } = batchSchema.parse(await request.json());
    if (events.some(e => e.match_id !== params.id)) {
      return NextResponse.json({ ok: false, error: 'mismatched_match_id' }, { status: 400 });
    }
    // Server actions enforce auth + permissions via RLS.
    for (const ev of events) await recordMatchEvent(ev);
    return NextResponse.json({ ok: true, count: events.length });
  } catch (err: any) {
    const status = err.name === 'ZodError' ? 400 : err.message === 'not_authenticated' ? 401 : 500;
    return NextResponse.json({ ok: false, error: err.message }, { status });
  }
}

// Public read endpoint — RLS allows public select on match_events.
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('match_events')
    .select('id, event_type, period, minute, extra_minute, team_id, player_id, is_cancelled')
    .eq('match_id', params.id)
    .eq('is_cancelled', false)
    .order('period').order('minute').order('extra_minute');
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, events: data });
}
