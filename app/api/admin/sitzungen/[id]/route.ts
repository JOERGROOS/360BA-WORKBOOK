import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { adminGeprueft } from '@/lib/admin-auth';

const SPALTEN_OHNE_TOKEN = 'id,vorname,nachname,firma,telefon,email,status,test,fragen_snapshot,antworten,aha,aktuelle_frage,pdf_path,created_at,updated_at,abgeschlossen_at';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!adminGeprueft(req)) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  const { id } = await params;
  const { data, error } = await db.from('wb_sessions').select(SPALTEN_OHNE_TOKEN).eq('id', id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
  return NextResponse.json(data);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!adminGeprueft(req)) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  const { id } = await params;
  // Der ganze Ordner `<id>/` gehört zur Sitzung (PDF, ggf. künftige weitere Dateien) — nicht nur pdf_path.
  const { data: dateien, error: eListe } = await db.storage.from('workbooks').list(id);
  if (eListe) { console.error('[admin sitzungen] Ordner listen', eListe); return NextResponse.json({ error: 'PDF konnte nicht gelöscht werden' }, { status: 500 }); }
  if (dateien && dateien.length > 0) {
    const { error: eStorage } = await db.storage.from('workbooks').remove(dateien.map((d) => `${id}/${d.name}`));
    if (eStorage) { console.error('[admin sitzungen] Ordner löschen', eStorage); return NextResponse.json({ error: 'PDF konnte nicht gelöscht werden' }, { status: 500 }); }
  }
  const { error } = await db.from('wb_sessions').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
