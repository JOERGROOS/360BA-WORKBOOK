import { NextResponse } from 'next/server';
import { sitzungLaden } from '@/lib/sitzung';
import { transkribiere } from '@/lib/stt';
import { glaette } from '@/lib/glaettung';
import { bremse } from '@/lib/bremse';

export const maxDuration = 60;

export async function POST(req: Request) {
  const token = req.headers.get('x-wb-token') ?? '';
  const s = await sitzungLaden(token);
  if (!s || s.status === 'abgeschlossen') return NextResponse.json({ error: 'Keine gültige Sitzung' }, { status: 401 });
  if (!bremse(`stt:${s.id}`, 60, 3600)) return NextResponse.json({ error: 'Zu viele Aufnahmen in kurzer Zeit.' }, { status: 429 });
  const form = await req.formData().catch(() => null);
  const audio = form?.get('audio');
  if (!(audio instanceof File) || audio.size === 0) return NextResponse.json({ error: 'Keine Aufnahme erhalten' }, { status: 400 });
  if (audio.size > 25 * 1024 * 1024) return NextResponse.json({ error: 'Aufnahme zu groß' }, { status: 413 });
  console.info('[transkribieren] eingang', { bytes: audio.size, typ: audio.type, name: audio.name });
  const t0 = Date.now();
  try {
    const roh = await transkribiere(audio);
    const text = await glaette(roh);
    const leer = roh.trim() === '';
    console.info('[transkribieren] ergebnis', { rohZeichen: roh.length, geglaettetZeichen: text.length, ms: Date.now() - t0, leer });
    if (leer) return NextResponse.json({ text: '', hinweis: 'leer' });
    return NextResponse.json({ text });
  } catch (e) {
    console.error('[transkribieren]', e);
    return NextResponse.json({ error: 'Aufnahme konnte nicht umgewandelt werden. Bitte tippen oder erneut versuchen.' }, { status: 502 });
  }
}
