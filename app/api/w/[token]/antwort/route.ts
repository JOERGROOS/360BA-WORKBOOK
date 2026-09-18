import { NextResponse } from 'next/server';
import { antwortSpeichern, sitzungLaden } from '@/lib/sitzung';
import { flach } from '@/lib/punkte';

export async function PUT(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const b = await req.json().catch(() => null);
  if (!b || typeof b.frageId !== 'string' || typeof b.position !== 'number') return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 });
  const wert = b.wert;
  if (b.frageId === '__aha') {
    if (typeof wert !== 'string' || wert.length > 20000) return NextResponse.json({ error: 'Ungültiger Wert' }, { status: 400 });
  } else {
    const s = await sitzungLaden(token);
    if (!s) return NextResponse.json({ error: 'Sitzung nicht gefunden' }, { status: 404 });
    const alle = flach(s.fragen_snapshot);
    // aktuelle_frage darf bis einschließlich anzahlFragen stehen (Stand "nach der letzten Frage") — siehe Interview.tsx weiter().
    if (b.position < 0 || b.position > alle.length) return NextResponse.json({ error: 'Ungültige Position' }, { status: 400 });
    const frage = alle.find((f) => f.frage.id === b.frageId)?.frage;
    if (!frage) return NextResponse.json({ error: 'Frage gehört nicht zu dieser Sitzung' }, { status: 400 });
    const ok = frage.typ === 'skala' ? typeof wert === 'number' && Number.isInteger(wert) && wert >= 1 && wert <= 10
      : frage.typ === 'text' ? typeof wert === 'string' && wert.length <= 20000
      : frage.typ === 'tabelle' ? typeof wert === 'object' && wert !== null && JSON.stringify(wert).length <= 5000
      : false;
    if (!ok) return NextResponse.json({ error: 'Ungültiger Wert' }, { status: 400 });
  }
  try { await antwortSpeichern(token, b.frageId, wert, b.position); return NextResponse.json({ ok: true }); }
  catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 409 }); }
}
