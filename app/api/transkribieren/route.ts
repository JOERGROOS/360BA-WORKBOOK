import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sitzungLaden } from '@/lib/sitzung';
import { texteLaden } from '@/lib/texte';
import { transkribiere } from '@/lib/stt';
import { glaette } from '@/lib/glaettung';
import { bremse } from '@/lib/bremse';

export const maxDuration = 60;

export async function POST(req: Request) {
  const token = req.headers.get('x-wb-token') ?? '';
  const s = await sitzungLaden(token);
  if (!s || s.status === 'abgeschlossen') return NextResponse.json({ error: 'Keine gültige Sitzung' }, { status: 401 });
  if (s.status === 'eingeladen') return NextResponse.json({ error: 'Bitte zuerst das Interview starten' }, { status: 409 });
  if (!bremse(`stt:${s.id}`, 60, 3600)) return NextResponse.json({ error: 'Zu viele Aufnahmen in kurzer Zeit.' }, { status: 429 });
  const form = await req.formData().catch(() => null);
  const audio = form?.get('audio');
  if (!(audio instanceof File) || audio.size === 0) return NextResponse.json({ error: 'Keine Aufnahme erhalten' }, { status: 400 });
  if (audio.size > 25 * 1024 * 1024) return NextResponse.json({ error: 'Aufnahme zu groß' }, { status: 413 });
  // Die Frage kommt bewusst NICHT als Text aus dem Browser, sondern wird hier über ihre
  // Kennung im Fragebogen der Sitzung nachgeschlagen — sonst könnte jemand über das
  // Formular beliebigen Text in die Anweisung an das Sprachmodell schieben.
  const frageId = String(form?.get('frageId') ?? '');
  const frage = frageId === 'aha'
    ? (await texteLaden()).aha_frage
    : s.fragen_snapshot.kapitel.flatMap((k) => k.fragen).find((f) => f.id === frageId)?.text;
  console.info('[transkribieren] eingang', { bytes: audio.size, typ: audio.type, name: audio.name, frage: frage ? 'bekannt' : 'ohne' });
  const t0 = Date.now();
  try {
    const roh = await transkribiere(audio);
    const text = await glaette(roh, frage);
    const leer = roh.trim() === '';
    console.info('[transkribieren] ergebnis', { rohZeichen: roh.length, geglaettetZeichen: text.length, ms: Date.now() - t0, leer });
    if (!leer) {
      const { error } = await db.from('wb_sessions').update({ diktate: s.diktate + 1 }).eq('id', s.id);
      if (error) console.error('[transkribieren] diktate-zaehler', error);
    }
    if (leer) return NextResponse.json({ text: '', hinweis: 'leer' });
    return NextResponse.json({ text });
  } catch (e) {
    console.error('[transkribieren]', e);
    return NextResponse.json({ error: 'Aufnahme konnte nicht umgewandelt werden. Bitte tippen oder erneut versuchen.' }, { status: 502 });
  }
}
