import { NextResponse } from 'next/server';
import { adminGeprueft, cookieKopf } from '@/lib/admin-auth';

export async function POST(req: Request) {
  if (!adminGeprueft(req)) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.headers.set('Set-Cookie', cookieKopf('', true));
  return res;
}
