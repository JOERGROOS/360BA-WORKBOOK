import { NextResponse } from 'next/server';
import { db, dbFehler } from '@/lib/db';
import { adminGeprueft } from '@/lib/admin-auth';

// Setzt das Signal für den Abholer auf Jörgs Mac (--nur-angefordert, alle 5 Minuten) —
// löscht es NICHT selbst; das macht der Abholer nach dem erfolgreichen Download.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!adminGeprueft(req)) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  const { id } = await params;
  const angefordert = new Date().toISOString();
  const { error } = await db.from('wb_sessions').update({ abholen_angefordert: angefordert }).eq('id', id);
  if (error) return dbFehler('abholen', error, 'Abholen konnte nicht angefordert werden.');
  return NextResponse.json({ ok: true, angefordert });
}
