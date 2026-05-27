import { NextResponse, type NextRequest } from 'next/server';
import { acceptInvitationByToken } from '@/lib/actions/invitations';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    if (typeof token !== 'string') return NextResponse.json({ ok: false, error: 'missing_token' }, { status: 400 });
    const result = await acceptInvitationByToken(token);
    return NextResponse.json({ ok: true, result });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
  }
}
