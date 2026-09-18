import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { adminGeprueft } from '@/lib/admin-auth';

const FRAGE_TYPEN = ['text', 'skala', 'tabelle'];

function tabelleGueltig(o: unknown): boolean {
  const zeilen = (o as { zeilen?: unknown })?.zeilen;
  const spalten = (o as { spalten?: unknown })?.spalten;
  const liste = (l: unknown) => Array.isArray(l) && l.length > 0 && l.every((v) => typeof v === 'string' && v.trim());
  return liste(zeilen) && liste(spalten);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!adminGeprueft(req)) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  const { id } = await params; const b = await req.json();
  if (b.richtung) {
    const { data: frage } = await db.from('wb_questions').select('chapter_id').eq('id', id).single();
    if (!frage) return NextResponse.json({ error: 'Frage nicht gefunden' }, { status: 404 });
    const { data: alle } = await db.from('wb_questions').select('id,position').eq('chapter_id', frage.chapter_id).order('position');
    const i = alle!.findIndex((f) => f.id === id); const j = b.richtung === 'hoch' ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= alle!.length) return NextResponse.json({ ok: true });
    await db.from('wb_questions').update({ position: alle![j].position }).eq('id', id);
    await db.from('wb_questions').update({ position: alle![i].position }).eq('id', alle![j].id);
    return NextResponse.json({ ok: true });
  }
  const erlaubt = ['text', 'hinweis', 'typ', 'optionen', 'aktiv'] as const;
  const upd: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of erlaubt) if (k in b) upd[k] = b[k];
  if (upd.typ && !FRAGE_TYPEN.includes(upd.typ as string)) return NextResponse.json({ error: 'Typ' }, { status: 400 });
  if (upd.typ === 'tabelle' && !tabelleGueltig(upd.optionen)) return NextResponse.json({ error: 'Zeilen und Spalten dürfen nicht leer sein' }, { status: 400 });
  const { error } = await db.from('wb_questions').update(upd).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!adminGeprueft(req)) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  const { id } = await params;
  const { error } = await db.from('wb_questions').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
