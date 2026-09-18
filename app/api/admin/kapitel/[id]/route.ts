import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { adminGeprueft } from '@/lib/admin-auth';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!adminGeprueft(req)) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  const { id } = await params; const b = await req.json();
  if (b.richtung) {
    const { data: alle, error: eAlle } = await db.from('wb_chapters').select('id,position').order('position');
    if (eAlle || !alle) return NextResponse.json({ error: eAlle?.message ?? 'Kapitel konnten nicht geladen werden' }, { status: 500 });
    const i = alle.findIndex((k) => k.id === id); const j = b.richtung === 'hoch' ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= alle.length) return NextResponse.json({ ok: true });
    await db.from('wb_chapters').update({ position: alle[j].position }).eq('id', id);
    await db.from('wb_chapters').update({ position: alle[i].position }).eq('id', alle[j].id);
    return NextResponse.json({ ok: true });
  }
  const erlaubt = ['titel', 'untertitel', 'einleitung', 'typ', 'aktiv'] as const;
  const upd: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of erlaubt) if (k in b) upd[k] = b[k];
  if (upd.typ && !['fakten', 'faktor'].includes(upd.typ as string)) return NextResponse.json({ error: 'Typ' }, { status: 400 });
  const { error } = await db.from('wb_chapters').update(upd).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!adminGeprueft(req)) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  const { id } = await params;
  const { count } = await db.from('wb_questions').select('id', { count: 'exact', head: true }).eq('chapter_id', id);
  if (count && count > 0) return NextResponse.json({ error: 'Kapitel hat noch Fragen' }, { status: 409 });
  const { error } = await db.from('wb_chapters').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
