import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { adminGeprueft } from '@/lib/admin-auth';

export async function GET(req: Request) {
  if (!adminGeprueft(req)) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  const { data: kapitel, error: e1 } = await db.from('wb_chapters').select('*').order('position');
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });
  const { data: fragen, error: e2 } = await db.from('wb_questions').select('*').order('position');
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
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
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
