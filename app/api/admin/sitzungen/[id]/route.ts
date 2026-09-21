import { NextResponse } from 'next/server';
import { db, dbFehler } from '@/lib/db';
import { adminGeprueft } from '@/lib/admin-auth';

const SPALTEN_OHNE_TOKEN = 'id,vorname,nachname,firma,telefon,email,status,test,fragen_snapshot,antworten,aha,aktuelle_frage,pdf_path,management_summary_path,created_at,updated_at,abgeschlossen_at';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!adminGeprueft(req)) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  const { id } = await params;
  const { data, error } = await db.from('wb_sessions').select(SPALTEN_OHNE_TOKEN).eq('id', id).maybeSingle();
  if (error) return dbFehler('sitzungen', error, 'Sitzung konnte nicht geladen werden.');
  if (!data) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
  return NextResponse.json(data);
}

// Termin vor Ort setzen/ändern/löschen — vom Team im Admin gepflegt, oder später von einer
// Automation aufgerufen (deshalb ein eigener, schlanker Endpunkt statt eines allgemeinen PATCH).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!adminGeprueft(req)) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const terminAm = b.termin_am === null || b.termin_am === '' ? null : String(b.termin_am);
  if (terminAm !== null && !/^\d{4}-\d{2}-\d{2}$/.test(terminAm)) return NextResponse.json({ error: 'Datum im Format JJJJ-MM-TT erwartet.' }, { status: 400 });
  const { error } = await db.from('wb_sessions').update({ termin_am: terminAm }).eq('id', id);
  if (error) return dbFehler('sitzungen', error, 'Termin konnte nicht gespeichert werden.');
  return NextResponse.json({ ok: true, termin_am: terminAm });
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
  // Finanzdaten-Bucket ebenfalls aufräumen — sonst bleiben hochgeladene Dateien als verwaiste
  // Objekte liegen, obwohl die wb_dateien-Zeilen per ON DELETE CASCADE mit der Sitzung verschwinden.
  const { data: finanzdaten, error: eListeFin } = await db.storage.from('finanzdaten').list(id);
  if (eListeFin) { console.error('[admin sitzungen] Finanzdaten-Ordner listen', eListeFin); return NextResponse.json({ error: 'Finanzdaten konnten nicht gelöscht werden' }, { status: 500 }); }
  if (finanzdaten && finanzdaten.length > 0) {
    const { error: eStorageFin } = await db.storage.from('finanzdaten').remove(finanzdaten.map((d) => `${id}/${d.name}`));
    if (eStorageFin) { console.error('[admin sitzungen] Finanzdaten-Ordner löschen', eStorageFin); return NextResponse.json({ error: 'Finanzdaten konnten nicht gelöscht werden' }, { status: 500 }); }
  }
  // Management-Summary-Bucket ebenfalls aufräumen — gleiches Muster wie oben.
  const { data: summaries, error: eListeSum } = await db.storage.from('management-summaries').list(id);
  if (eListeSum) { console.error('[admin sitzungen] Management-Summary-Ordner listen', eListeSum); return NextResponse.json({ error: 'Management Summary konnte nicht gelöscht werden' }, { status: 500 }); }
  if (summaries && summaries.length > 0) {
    const { error: eStorageSum } = await db.storage.from('management-summaries').remove(summaries.map((d) => `${id}/${d.name}`));
    if (eStorageSum) { console.error('[admin sitzungen] Management-Summary-Ordner löschen', eStorageSum); return NextResponse.json({ error: 'Management Summary konnte nicht gelöscht werden' }, { status: 500 }); }
  }
  const { error } = await db.from('wb_sessions').delete().eq('id', id);
  if (error) return dbFehler('sitzungen', error, 'Sitzung konnte nicht gelöscht werden.');
  return NextResponse.json({ ok: true });
}
