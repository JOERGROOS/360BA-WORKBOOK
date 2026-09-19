import { NextResponse } from 'next/server';
import { sitzungLaden } from '@/lib/sitzung';
import { dateienFuer, dateiRegistrieren } from '@/lib/dateien';
import { bremse } from '@/lib/bremse';

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const s = await sitzungLaden(token);
  if (!s) return NextResponse.json({ error: 'Link ungültig' }, { status: 404 });
  const dateien = await dateienFuer(s.id);
  return NextResponse.json(dateien);
}

// Meldet eine bereits per Upload-Adresse hochgeladene Datei an — Upload ist in jedem
// Sitzungsstatus erlaubt, auch "eingeladen" (Finanzdaten können vor dem Interview kommen)
// und "abgeschlossen" (Kunde findet noch eine Datei nach dem gemeinsamen Tag).
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const s = await sitzungLaden(token);
  if (!s) return NextResponse.json({ error: 'Link ungültig' }, { status: 404 });
  if (!bremse(`upload:${s.id}`, 60, 3600)) return NextResponse.json({ error: 'Zu viele Uploads. Bitte später erneut.' }, { status: 429 });
  const b = await req.json().catch(() => null);
  if (!b || typeof b.pfad !== 'string' || typeof b.dateiname !== 'string' || typeof b.bytes !== 'number' || typeof b.content_type !== 'string') {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 });
  }
  try {
    await dateiRegistrieren(s, { pfad: b.pfad, dateiname: b.dateiname, bytes: b.bytes, content_type: b.content_type });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
