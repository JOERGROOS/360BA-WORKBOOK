import { NextResponse } from 'next/server';
import { db, dbFehler } from '@/lib/db';
import { adminGeprueft } from '@/lib/admin-auth';
import { dateienFuerZip, dateiHerunterladen } from '@/lib/dateien';
import { ordnerName, contentDispositionAttachment } from '@/lib/dateinamen';
import { zipStoreBuffer, type ZipEintrag } from '@/lib/zip';

export const maxDuration = 60;

// Alle hochgeladenen Dateien einer Sitzung als ein ZIP (ohne Kompression). Lädt zuerst JEDE
// Datei einzeln herunter (eigener try/catch je Datei) — erst wenn alles im Speicher liegt,
// wird das ZIP gebaut und die Antwort geschickt. So kann die Antwort nie mitten im Stream
// abbrechen; eine einzelne kaputte Datei blockiert nicht die anderen, sondern landet als
// Hinweis in `FEHLENDE-DATEIEN.txt` im ZIP.
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

  const eintraege: ZipEintrag[] = [];
  const fehlgeschlagen: string[] = [];
  for (const d of dateien) {
    try {
      const bytes = await dateiHerunterladen(d.pfad);
      eintraege.push({ name: d.dateiname, daten: async () => bytes });
    } catch (e) {
      console.error('[admin dateien zip]', d.pfad, e);
      fehlgeschlagen.push(d.dateiname);
    }
  }
  if (eintraege.length === 0) return NextResponse.json({ error: 'ZIP konnte nicht erstellt werden' }, { status: 500 });
  if (fehlgeschlagen.length > 0) {
    const hinweis = `Diese Dateien konnten gerade nicht geladen werden — später erneut versuchen:\n${fehlgeschlagen.join('\n')}\n`;
    eintraege.push({ name: 'FEHLENDE-DATEIEN.txt', daten: async () => Buffer.from(hinweis, 'utf8') });
  }

  const zip = await zipStoreBuffer(eintraege);
  const dateiname = `Finanzdaten-${ordnerName(s.firma, id)}.zip`;
  return new Response(new Uint8Array(zip), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': contentDispositionAttachment(dateiname),
      'Content-Length': String(zip.length),
    },
  });
}
