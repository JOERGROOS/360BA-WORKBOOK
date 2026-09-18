import { NextResponse } from 'next/server';
import { cookieKopf, cookieWert, gleichOhneZeitverrat, loginErlaubt } from '@/lib/admin-auth';

export async function POST(req: Request) {
  if (!loginErlaubt(req)) return NextResponse.json({ error: 'Zu viele Versuche. Bitte später erneut.' }, { status: 429 });
  const b = await req.json().catch(() => ({}));
  const passwort = String(b.passwort ?? '');
  const soll = process.env.ADMIN_PASSWORD ?? '';
  if (!soll || !gleichOhneZeitverrat(passwort, soll)) return NextResponse.json({ error: 'Passwort falsch.' }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.headers.set('Set-Cookie', cookieKopf(cookieWert()));
  return res;
}
