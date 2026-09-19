import { NextResponse } from 'next/server';
import { db, dbFehler } from '@/lib/db';
import { adminGeprueft } from '@/lib/admin-auth';
import { texteLaden } from '@/lib/texte';

export async function GET(req: Request) {
  if (!adminGeprueft(req)) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  return NextResponse.json(await texteLaden());
}

export async function PUT(req: Request) {
  if (!adminGeprueft(req)) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const key = String(b.key ?? '');
  if (!key) return NextResponse.json({ error: 'Schlüssel fehlt' }, { status: 400 });
  const { error } = await db.from('wb_texte').upsert({ key, wert: String(b.wert ?? ''), updated_at: new Date().toISOString() });
  if (error) return dbFehler('texte', error, 'Text konnte nicht gespeichert werden.');
  return NextResponse.json({ ok: true });
}
