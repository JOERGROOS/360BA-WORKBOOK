import { NextResponse } from 'next/server';
import { sitzungLaden } from '@/lib/sitzung';
import { linkMailSenden } from '@/lib/mail';
import { bremse } from '@/lib/bremse';

export async function POST(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const s = await sitzungLaden(token);
  if (!s) return NextResponse.json({ error: 'Link ungültig' }, { status: 404 });
  if (!bremse(`link:${s.id}`, 3, 3600)) return NextResponse.json({ error: 'Der Link wurde gerade schon geschickt.' }, { status: 429 });
  await linkMailSenden(s);
  return NextResponse.json({ ok: true });
}
