import { NextResponse } from 'next/server';
import { sitzungLaden } from '@/lib/sitzung';
import { dateienFuer, EingabeFehler } from '@/lib/dateien';
import { finanzdatenMailSenden } from '@/lib/mail';
import { bremse } from '@/lib/bremse';

// Der letzte Schritt im Upload-Overlay: eine interne Mail ans Team, keine Anhänge.
// Scheitert der Mailversand (z. B. RESEND_API_KEY fehlt lokal), bleibt die Antwort trotzdem
// ok — die Dateien liegen sicher im Speicher, nur die Benachrichtigung fehlt.
export async function POST(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const s = await sitzungLaden(token);
  if (!s) return NextResponse.json({ error: 'Link ungültig' }, { status: 404 });
  if (!bremse(`melden:${s.id}`, 5, 3600)) return NextResponse.json({ error: 'Zu viele Meldungen. Bitte später erneut.' }, { status: 429 });
  try {
    const dateien = await dateienFuer(s.id);
    if (dateien.length === 0) return NextResponse.json({ error: 'Noch keine Dateien hochgeladen.' }, { status: 400 });
    try {
      await finanzdatenMailSenden(s, dateien.map((d) => d.dateiname));
    } catch (e) {
      console.error('[dateien melden] Mail', e);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof EingabeFehler) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error('[dateien melden]', e);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}
