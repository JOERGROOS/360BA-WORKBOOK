import { NextResponse } from 'next/server';
import { sitzungLaden } from '@/lib/sitzung';
import { signierteAdresse } from '@/lib/abschluss';

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const s = await sitzungLaden(token);
  if (!s || s.status !== 'abgeschlossen' || !s.pdf_path) return NextResponse.json({ error: 'Workbook noch nicht fertig' }, { status: 404 });
  const url = await signierteAdresse(s.pdf_path);
  return NextResponse.json({ url });
}
