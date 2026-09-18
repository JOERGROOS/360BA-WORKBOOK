import { NextResponse } from 'next/server';
import { db, type Sitzung } from '@/lib/db';
import { adminGeprueft } from '@/lib/admin-auth';
import { linkMailSenden } from '@/lib/mail';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!adminGeprueft(req)) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  const { id } = await params;
  const { data: s } = await db.from('wb_sessions').select('*').eq('id', id).maybeSingle();
  if (!s) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
  try {
    await linkMailSenden(s as Sitzung);
  } catch (e) {
    console.error('[admin link]', e);
    return NextResponse.json({ error: 'Der Link konnte gerade nicht verschickt werden.' }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
