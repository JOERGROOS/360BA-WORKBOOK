import { NextResponse } from 'next/server';
import { db, type Sitzung } from '@/lib/db';
import { adminGeprueft } from '@/lib/admin-auth';
import { abschliessen, signierteAdresse } from '@/lib/abschluss';

export const maxDuration = 60;

async function sitzungLadenPerId(id: string): Promise<Sitzung | null> {
  const { data } = await db.from('wb_sessions').select('*').eq('id', id).maybeSingle();
  return (data as Sitzung) ?? null;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!adminGeprueft(req)) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  const { id } = await params;
  const s = await sitzungLadenPerId(id);
  if (!s || s.status !== 'abgeschlossen' || !s.pdf_path) return NextResponse.json({ error: 'PDF noch nicht vorhanden' }, { status: 404 });
  const url = await signierteAdresse(s.pdf_path);
  return NextResponse.json({ url });
}

// Erzeugt die PDF neu (z. B. nach Text-Änderungen) — verschickt keine Mail.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!adminGeprueft(req)) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  const { id } = await params;
  const s = await sitzungLadenPerId(id);
  if (!s) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
  try {
    const { pfad } = await abschliessen(s, true);
    const url = await signierteAdresse(pfad);
    return NextResponse.json({ url });
  } catch (e) {
    console.error('[admin pdf]', e);
    return NextResponse.json({ error: 'PDF konnte nicht erzeugt werden' }, { status: 500 });
  }
}
