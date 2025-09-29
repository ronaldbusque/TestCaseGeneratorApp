import { NextRequest, NextResponse } from 'next/server';

const USER_ID_HEADER = 'X-User-Identifier';
const ADMIN_IDENTIFIER = '__admin__';

export async function GET(request: NextRequest) {
  const userIdentifier = request.headers.get(USER_ID_HEADER);

  if (userIdentifier !== ADMIN_IDENTIFIER) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}
