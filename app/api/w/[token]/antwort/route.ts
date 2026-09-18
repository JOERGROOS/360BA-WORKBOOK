import { NextResponse } from 'next/server';
import { antwortSpeichern } from '@/lib/sitzung';

export async function PUT(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const b = await req.json().catch(() => null);
  if (!b || typeof b.frageId !== 'string' || typeof b.position !== 'number') return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 });
  const wert = b.wert;
  const ok = typeof wert === 'string' ? wert.length <= 20000 : typeof wert === 'number' ? Number.isInteger(wert) && wert >= 1 && wert <= 10 : typeof wert === 'object' && wert !== null && JSON.stringify(wert).length <= 5000;
  if (!ok) return NextResponse.json({ error: 'Ungültiger Wert' }, { status: 400 });
  try { await antwortSpeichern(token, b.frageId, wert, b.position); return NextResponse.json({ ok: true }); }
  catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 409 }); }
}
