import { NextResponse } from 'next/server';
import { sitzungLaden } from '@/lib/sitzung';
import { fortschritt } from '@/lib/punkte';

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const s = await sitzungLaden(token);
  if (!s) return NextResponse.json({ error: 'Link ungültig' }, { status: 404 });
  return NextResponse.json({
    vorname: s.vorname, status: s.status, snapshot: s.fragen_snapshot, antworten: s.antworten, aha: s.aha,
    aktuelleFrage: s.aktuelle_frage, fortschritt: fortschritt(s.fragen_snapshot, s.antworten), pdf: !!s.pdf_path,
  });
}
