import { NextResponse } from 'next/server';
import { db, dbFehler } from '@/lib/db';
import { adminGeprueft } from '@/lib/admin-auth';

export async function GET(req: Request) {
  if (!adminGeprueft(req)) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  const { data: kapitel, error: e1 } = await db.from('wb_chapters').select('*').order('position');
  if (e1) return dbFehler('kapitel', e1, 'Kapitel konnten nicht geladen werden.');
  const { data: fragen, error: e2 } = await db.from('wb_questions').select('*').order('position');
  if (e2) return dbFehler('kapitel', e2, 'Fragen konnten nicht geladen werden.');
  return NextResponse.json({ kapitel, fragen });
}

export async function POST(req: Request) {
  if (!adminGeprueft(req)) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const titel = String(b.titel ?? '').trim();
  if (!titel) return NextResponse.json({ error: 'Titel fehlt' }, { status: 400 });
  if (!['fakten', 'faktor'].includes(b.typ)) return NextResponse.json({ error: 'Typ' }, { status: 400 });
  const { data: letztes } = await db.from('wb_chapters').select('position').order('position', { ascending: false }).limit(1);
  const position = (letztes?.[0]?.position ?? 0) + 1;
  const { data, error } = await db.from('wb_chapters')
    .insert({ titel, untertitel: String(b.untertitel ?? ''), einleitung: String(b.einleitung ?? ''), typ: b.typ, position })
    .select('*').single();
  if (error) return dbFehler('kapitel', error, 'Kapitel konnte nicht angelegt werden.');
  return NextResponse.json(data);
}
