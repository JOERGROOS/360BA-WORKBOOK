import { NextResponse } from 'next/server';
import { adminGeprueft } from '@/lib/admin-auth';
import { dateienFuerAdmin } from '@/lib/dateien';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!adminGeprueft(req)) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  const { id } = await params;
  try {
    const dateien = await dateienFuerAdmin(id);
    return NextResponse.json(dateien);
  } catch (e) {
    console.error('[admin dateien]', e);
    return NextResponse.json({ error: 'Dateien konnten nicht geladen werden' }, { status: 500 });
  }
}
