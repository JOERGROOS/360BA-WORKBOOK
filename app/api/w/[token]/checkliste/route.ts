import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sitzungLaden } from '@/lib/sitzung';
import { istPunkt } from '@/lib/checkliste';

// Ein Haken in der Unterlagen-Checkliste. Bewusst je Punkt gespeichert statt der ganzen
// Liste: Hakt der Kunde auf dem Handy und gleichzeitig am Rechner etwas ab, überschreibt
// keiner den anderen.
export async function PUT(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const s = await sitzungLaden(token);
  if (!s) return NextResponse.json({ error: 'Sitzung nicht gefunden' }, { status: 404 });
  const b = await req.json().catch(() => null);
  if (!b || !istPunkt(b.punkt) || typeof b.an !== 'boolean') return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 });
  const neu = { ...(s.checkliste ?? {}), [b.punkt]: b.an };
  const { error } = await db.from('wb_sessions').update({ checkliste: neu, updated_at: new Date().toISOString() }).eq('id', s.id);
  if (error) return NextResponse.json({ error: 'Nicht gespeichert' }, { status: 500 });
  return NextResponse.json({ ok: true, checkliste: neu });
}
