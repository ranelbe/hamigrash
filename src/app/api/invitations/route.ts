import { NextResponse, type NextRequest } from 'next/server';
import { invitationCreateSchema } from '@/lib/schemas';
import { createInvitation } from '@/lib/actions/invitations';

// Create invitation — same contract as the server action, exposed as JSON.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = invitationCreateSchema.parse(body);
    const inv = await createInvitation(input);
    return NextResponse.json({ ok: true, invitation: inv });
  } catch (err: any) {
    const status = err.name === 'ZodError' ? 400 : err.message === 'not_authenticated' ? 401 : 500;
    return NextResponse.json({ ok: false, error: err.message }, { status });
  }
}
