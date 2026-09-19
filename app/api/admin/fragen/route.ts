import { NextResponse } from 'next/server';
import { db, dbFehler } from '@/lib/db';
import { adminGeprueft } from '@/lib/admin-auth';
import { FRAGE_TYPEN, tabelleGueltig } from '@/lib/frage-validierung';

// Neue Fragen starten als Entwurf (inaktiv) — sie erscheinen erst nach bewusstem Aktivieren im Interview.
export async function POST(req: Request) {
  if (!adminGeprueft(req)) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const text = String(b.text ?? '').trim();
  if (!b.chapter_id || !text) return NextResponse.json({ error: 'Kapitel und Fragetext nötig' }, { status: 400 });
  if (!FRAGE_TYPEN.includes(b.typ)) return NextResponse.json({ error: 'Typ' }, { status: 400 });
  if (b.typ === 'tabelle' && !tabelleGueltig(b.optionen)) return NextResponse.json({ error: 'Zeilen und Spalten dürfen nicht leer sein' }, { status: 400 });
  const { data: letzte } = await db.from('wb_questions').select('position').eq('chapter_id', b.chapter_id).order('position', { ascending: false }).limit(1);
  const position = (letzte?.[0]?.position ?? 0) + 1;
  const { data, error } = await db.from('wb_questions')
    .insert({ chapter_id: b.chapter_id, text, hinweis: String(b.hinweis ?? ''), typ: b.typ, optionen: b.optionen ?? {}, position, aktiv: false })
    .select('*').single();
  if (error) return dbFehler('fragen', error, 'Frage konnte nicht angelegt werden.');
  return NextResponse.json(data);
}
