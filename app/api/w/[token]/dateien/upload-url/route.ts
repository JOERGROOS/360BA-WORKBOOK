import { NextResponse } from 'next/server';
import { sitzungLaden } from '@/lib/sitzung';
import { uploadAdresse, EingabeFehler } from '@/lib/dateien';
import { bremse } from '@/lib/bremse';

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const s = await sitzungLaden(token);
  if (!s) return NextResponse.json({ error: 'Link ungültig' }, { status: 404 });
  if (!bremse(`upload:${s.id}`, 60, 3600)) return NextResponse.json({ error: 'Zu viele Uploads. Bitte später erneut.' }, { status: 429 });
  // Eigene, engere Bremse nur für diese Route: eine signierte Adresse allein erlaubt noch
  // keinen registrierten Upload, ist aber der teure Schritt gegen den Speicher — getrennt
  // gezählt, damit unregistrierte PUTs nicht beliebig oft angefordert werden können.
  if (!bremse(`upload-url:${s.id}`, 40, 3600)) return NextResponse.json({ error: 'Zu viele Uploads. Bitte später erneut.' }, { status: 429 });
  const b = await req.json().catch(() => null);
  if (!b || typeof b.dateiname !== 'string' || typeof b.contentType !== 'string' || typeof b.bytes !== 'number') {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 });
  }
  try {
    const adresse = await uploadAdresse(s, b.dateiname, b.contentType, b.bytes);
    return NextResponse.json(adresse);
  } catch (e) {
    if (e instanceof EingabeFehler) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error('[upload-url]', e);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}
