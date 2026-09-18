import { NextResponse } from 'next/server';
import { sitzungLaden } from '@/lib/sitzung';
import { abschliessen } from '@/lib/abschluss';
import { punkteJeFaktor } from '@/lib/punkte';

export const maxDuration = 60;

export async function POST(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const s = await sitzungLaden(token);
  if (!s) return NextResponse.json({ error: 'Link ungültig' }, { status: 404 });
  const offen = punkteJeFaktor(s.fragen_snapshot, s.antworten).some((p) => s.fragen_snapshot.kapitel.find((k) => k.id === p.kapitelId)!.fragen.some((f) => f.typ === 'skala' && typeof s.antworten[f.id] !== 'number'));
  if (offen) return NextResponse.json({ error: 'Es fehlen noch Aussagen.' }, { status: 400 });
  try {
    const { mailFehler } = await abschliessen(s);
    return NextResponse.json({ ok: true, mailFehler: !!mailFehler });
  } catch (e) {
    console.error('[abschluss]', e);
    return NextResponse.json({ error: 'Wir konnten dein Workbook gerade nicht erstellen. Deine Antworten sind sicher. Bitte in einer Minute erneut versuchen.' }, { status: 500 });
  }
}
