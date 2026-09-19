import { NextResponse } from 'next/server';
import { sitzungLaden, sitzungStarten } from '@/lib/sitzung';
import { linkMailSenden } from '@/lib/mail';
import { bremse } from '@/lib/bremse';

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const s = await sitzungLaden(token);
  if (!s) return NextResponse.json({ error: 'Link ungültig' }, { status: 404 });
  if (s.status !== 'eingeladen') return NextResponse.json({ error: 'Interview ist bereits gestartet' }, { status: 409 });
  if (!bremse(`start:${s.id}`, 5, 3600)) return NextResponse.json({ error: 'Zu viele Versuche. Bitte später erneut.' }, { status: 429 });
  const b = await req.json().catch(() => ({}));
  const feld = (k: string, max = 120) => String(b[k] ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
  const k = { vorname: feld('vorname'), nachname: feld('nachname'), firma: feld('firma', 200), telefon: feld('telefon', 40), email: feld('email').toLowerCase() };
  if (!k.vorname || !k.nachname || !k.firma || !k.email) return NextResponse.json({ error: 'Bitte alle Pflichtfelder ausfüllen.' }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(k.email)) return NextResponse.json({ error: 'Die E-Mail-Adresse sieht nicht richtig aus.' }, { status: 400 });
  let neu;
  try { neu = await sitzungStarten(token, k); }
  catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 409 }); }
  try { await linkMailSenden(neu); } catch (e) { console.error('[start] Link-Mail', e); }
  return NextResponse.json({ ok: true });
}
