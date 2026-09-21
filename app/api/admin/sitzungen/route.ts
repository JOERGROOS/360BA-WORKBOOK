import { NextResponse } from 'next/server';
import { db, dbFehler } from '@/lib/db';
import { adminGeprueft } from '@/lib/admin-auth';
import { einladungAnlegen, linkFuer } from '@/lib/sitzung';
import { fortschritt } from '@/lib/punkte';
import type { Snapshot, Antworten } from '@/lib/db';

export async function GET(req: Request) {
  if (!adminGeprueft(req)) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  const { data, error } = await db.from('wb_sessions')
    .select('id,token,vorname,nachname,firma,email,status,test,created_at,abgeschlossen_at,fragen_snapshot,antworten,abholen_angefordert,termin_am,management_summary_path,checkliste')
    .order('created_at', { ascending: false });
  if (error) return dbFehler('sitzungen', error, 'Sitzungen konnten nicht geladen werden.');
  const aus = (data ?? []).map((s) => {
    const { fragen_snapshot, antworten, token, ...rest } = s as { fragen_snapshot: Snapshot; antworten: Antworten; token: string } & Record<string, unknown>;
    return { ...rest, prozent: fortschritt(fragen_snapshot, antworten).prozent, link: linkFuer({ token }) };
  });
  return NextResponse.json(aus);
}

// Einladung anlegen: Standard-Weg für neue Sitzungen (Admin-Formular) und der Knopf "Vorschau als Kunde"
// (test: true). Die Mail verschickt der Admin danach gezielt über /[id]/link.
export async function POST(req: Request) {
  if (!adminGeprueft(req)) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const feld = (k: string, max = 120) => String(b[k] ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
  const k = { vorname: feld('vorname'), nachname: feld('nachname'), firma: feld('firma', 200), telefon: feld('telefon', 40), email: feld('email').toLowerCase() };
  if (!k.vorname || !k.nachname || !k.firma || !k.email) return NextResponse.json({ error: 'Bitte alle Pflichtfelder ausfüllen.' }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(k.email)) return NextResponse.json({ error: 'Die E-Mail-Adresse sieht nicht richtig aus.' }, { status: 400 });
  const s = await einladungAnlegen(k, b.test === true);
  return NextResponse.json({ id: s.id, link: linkFuer(s) });
}
