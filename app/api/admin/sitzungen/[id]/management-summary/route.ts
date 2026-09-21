import { NextResponse } from 'next/server';
import { db, type Sitzung } from '@/lib/db';
import { adminGeprueft } from '@/lib/admin-auth';

const BUCKET = 'management-summaries';

async function sitzungLadenPerId(id: string): Promise<Sitzung | null> {
  const { data } = await db.from('wb_sessions').select('*').eq('id', id).maybeSingle();
  return (data as Sitzung) ?? null;
}

// Signierte Download-Adresse für die vom Team gebrauchte Management Summary — dieselbe Datei,
// die auch per Mail an controlling@ ging, hier zusätzlich direkt aus dem Admin abrufbar.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!adminGeprueft(req)) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  const { id } = await params;
  const s = await sitzungLadenPerId(id);
  if (!s || !s.management_summary_path) return NextResponse.json({ error: 'Noch keine Management Summary vorhanden' }, { status: 404 });
  const { data, error } = await db.storage.from(BUCKET).createSignedUrl(s.management_summary_path, 3600);
  if (error || !data) return NextResponse.json({ error: 'Adresse konnte nicht erzeugt werden' }, { status: 500 });
  return NextResponse.json({ url: data.signedUrl });
}
