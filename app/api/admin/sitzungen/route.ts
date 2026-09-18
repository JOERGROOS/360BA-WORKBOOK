import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { adminGeprueft } from '@/lib/admin-auth';
import { sitzungAnlegen, linkFuer } from '@/lib/sitzung';
import { linkMailSenden } from '@/lib/mail';
import { fortschritt } from '@/lib/punkte';
import type { Snapshot, Antworten } from '@/lib/db';

export async function GET(req: Request) {
  if (!adminGeprueft(req)) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  const { data, error } = await db.from('wb_sessions')
    .select('id,vorname,nachname,firma,email,status,test,created_at,abgeschlossen_at,fragen_snapshot,antworten')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const aus = (data ?? []).map((s) => {
    const { fragen_snapshot, antworten, ...rest } = s as { fragen_snapshot: Snapshot; antworten: Antworten } & Record<string, unknown>;
    return { ...rest, prozent: fortschritt(fragen_snapshot, antworten).prozent };
  });
  return NextResponse.json(aus);
}

// Testsitzung mit Jörgs eigenen Daten für den Knopf "Vorschau als Kunde".
export async function POST(req: Request) {
  if (!adminGeprueft(req)) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  if (b.test !== true) return NextResponse.json({ error: 'test:true nötig' }, { status: 400 });
  const s = await sitzungAnlegen({ vorname: 'Jörg', nachname: 'Test', firma: 'JOERG ROOS', telefon: '', email: process.env.ADMIN_TEST_EMAIL || 'office@joerg-roos.com' }, true);
  try { await linkMailSenden(s); } catch (e) { console.error('[admin sitzungen] Link-Mail', e); }
  return NextResponse.json({ link: linkFuer(s) });
}
