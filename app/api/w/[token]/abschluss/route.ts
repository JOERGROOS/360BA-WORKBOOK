import { NextResponse } from 'next/server';
import { after } from 'next/server';
import { sitzungLaden } from '@/lib/sitzung';
import { abschliessen } from '@/lib/abschluss';
import { punkteJeFaktor } from '@/lib/punkte';
import { managementSummaryErstellenUndSenden } from '@/lib/management-summary-lauf';

// Etwas großzügiger als sonst (Standard 60s): `after()` unten läuft noch innerhalb dieses
// Zeitfensters weiter, auch nachdem die Antwort an den Kunden schon raus ist.
export const maxDuration = 90;

export async function POST(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const s = await sitzungLaden(token);
  if (!s) return NextResponse.json({ error: 'Link ungültig' }, { status: 404 });
  const offen = punkteJeFaktor(s.fragen_snapshot, s.antworten).some((p) => s.fragen_snapshot.kapitel.find((k) => k.id === p.kapitelId)!.fragen.some((f) => f.typ === 'skala' && typeof s.antworten[f.id] !== 'number'));
  if (offen) return NextResponse.json({ error: 'Es fehlen noch Aussagen.' }, { status: 400 });
  try {
    const { pfad, mailFehler, neuAbgeschlossen } = await abschliessen(s);
    // Verlierer eines gleichzeitigen Abschlusses: PDF liegt noch nicht (anderer Aufruf rendert gerade).
    if (!pfad) return NextResponse.json({ error: 'Wird gerade erstellt – bitte in einer Minute erneut' }, { status: 409 });
    // Management Summary für Jörg und Team — im Hintergrund NACH der Antwort an den Kunden, damit
    // die KI-Analyse dessen Abschluss nicht verzögert. Nur beim echten Erst-Abschluss, nie bei
    // "PDF neu erzeugen" im Admin. Ein Fehler hier darf den Kunden-Abschluss nie zurücknehmen.
    if (neuAbgeschlossen) {
      after(() => managementSummaryErstellenUndSenden(s).catch((e) => console.error('[abschluss] Management Summary', e)));
    }
    return NextResponse.json({ ok: true, mailFehler: !!mailFehler });
  } catch (e) {
    console.error('[abschluss]', e);
    return NextResponse.json({ error: 'Wir konnten dein Workbook gerade nicht erstellen. Deine Antworten sind sicher. Bitte in einer Minute erneut versuchen.' }, { status: 500 });
  }
}
