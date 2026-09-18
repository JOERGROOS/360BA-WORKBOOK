import { NextResponse } from 'next/server';
import { cookieKopf } from '@/lib/admin-auth';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.headers.set('Set-Cookie', cookieKopf('', true));
  return res;
}
