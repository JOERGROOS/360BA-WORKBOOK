import { NextResponse } from 'next/server';
import { sitzungLaden } from '@/lib/sitzung';
import { uploadAdresse } from '@/lib/dateien';
import { bremse } from '@/lib/bremse';

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const s = await sitzungLaden(token);
  if (!s) return NextResponse.json({ error: 'Link ungültig' }, { status: 404 });
  if (!bremse(`upload:${s.id}`, 60, 3600)) return NextResponse.json({ error: 'Zu viele Uploads. Bitte später erneut.' }, { status: 429 });
  const b = await req.json().catch(() => null);
  if (!b || typeof b.dateiname !== 'string' || typeof b.contentType !== 'string' || typeof b.bytes !== 'number') {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 });
  }
  try {
    const adresse = await uploadAdresse(s, b.dateiname, b.contentType, b.bytes);
    return NextResponse.json(adresse);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
