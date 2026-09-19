import { NextResponse } from 'next/server';
import { db, dbFehler } from '@/lib/db';
import { adminGeprueft } from '@/lib/admin-auth';
import { dateienFuerZip, dateiHerunterladen } from '@/lib/dateien';
import { ordnerName } from '@/lib/dateinamen';
import { zipStoreStream } from '@/lib/zip';

export const maxDuration = 60;

// Alle hochgeladenen Dateien einer Sitzung als ein ZIP (ohne Kompression) — läuft im
// Speicher zusammen, keine der Dateien darf über 50 MB sein, insgesamt höchstens 30.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!adminGeprueft(req)) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  const { id } = await params;
  const { data: s, error: eS } = await db.from('wb_sessions').select('firma').eq('id', id).maybeSingle();
  if (eS) return dbFehler('dateien zip', eS, 'Sitzung konnte nicht geladen werden.');
  if (!s) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
  let dateien;
  try {
    dateien = await dateienFuerZip(id);
  } catch (e) {
    console.error('[admin dateien zip]', e);
    return NextResponse.json({ error: 'Dateien konnten nicht geladen werden' }, { status: 500 });
  }
  if (dateien.length === 0) return NextResponse.json({ error: 'Keine Dateien' }, { status: 404 });
  const stream = zipStoreStream(dateien.map((d) => ({ name: d.dateiname, daten: () => dateiHerunterladen(d.pfad) })));
  const dateiname = `Finanzdaten-${ordnerName(s.firma, id)}.zip`;
  return new Response(stream, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${dateiname}"`,
    },
  });
}
