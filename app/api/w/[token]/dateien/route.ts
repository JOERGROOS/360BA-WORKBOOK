import { NextResponse } from 'next/server';
import { sitzungLaden } from '@/lib/sitzung';
import { dateienFuer, dateiRegistrieren, EingabeFehler } from '@/lib/dateien';
import { bremse } from '@/lib/bremse';

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const s = await sitzungLaden(token);
  if (!s) return NextResponse.json({ error: 'Link ungültig' }, { status: 404 });
  try {
    const dateien = await dateienFuer(s.id);
    return NextResponse.json(dateien);
  } catch (e) {
    console.error('[dateien liste]', e);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
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
  if (!b || typeof b.pfad !== 'string') {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 });
  }
  try {
    await dateiRegistrieren(s, { pfad: b.pfad });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof EingabeFehler) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error('[dateien registrieren]', e);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}
