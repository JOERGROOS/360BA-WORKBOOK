import { NextResponse } from 'next/server';
import { sitzungAnlegen, linkFuer } from '@/lib/sitzung';
import { linkMailSenden } from '@/lib/mail';
import { bremse, aufruferIp } from '@/lib/bremse';

export async function POST(req: Request) {
  if (!bremse(`start:${aufruferIp(req)}`, 10, 3600)) return NextResponse.json({ error: 'Zu viele Versuche. Bitte später erneut.' }, { status: 429 });
  const b = await req.json().catch(() => ({}));
  const feld = (k: string, max = 120) => String(b[k] ?? '').trim().slice(0, max);
  const k = { vorname: feld('vorname'), nachname: feld('nachname'), firma: feld('firma', 200), telefon: feld('telefon', 40), email: feld('email').toLowerCase() };
  if (!k.vorname || !k.nachname || !k.firma || !k.email) return NextResponse.json({ error: 'Bitte alle Pflichtfelder ausfüllen.' }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(k.email)) return NextResponse.json({ error: 'Die E-Mail-Adresse sieht nicht richtig aus.' }, { status: 400 });
  const s = await sitzungAnlegen(k, b.test === true && req.headers.get('x-wb-test') === 'ja');
  try { await linkMailSenden(s); } catch (e) { console.error('[start] Link-Mail', e); }
  return NextResponse.json({ link: linkFuer(s), token: s.token });
}
