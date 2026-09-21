import { NextResponse } from 'next/server';
import { adminGeprueft, cronGeprueft } from '@/lib/admin-auth';
import { erinnerungenPruefenUndSenden } from '@/lib/erinnerungen-lauf';

// Täglicher Lauf (Vercel Cron, siehe vercel.json) + Jörgs „Jetzt prüfen"-Knopf im Admin
// (Bereich Kunden). Fehlertoleranz wie beim Abholer: eine Mail, die nicht zu senden ist,
// stoppt nicht den ganzen Lauf für alle anderen Sitzungen.
export async function GET(req: Request) {
  if (!adminGeprueft(req) && !cronGeprueft(req)) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  try {
    const ergebnis = await erinnerungenPruefenUndSenden();
    return NextResponse.json(ergebnis);
  } catch (e) {
    console.error('[cron erinnerungen]', e);
    return NextResponse.json({ error: 'Lauf abgebrochen, siehe Server-Log.' }, { status: 500 });
  }
}
