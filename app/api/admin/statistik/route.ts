import { NextResponse } from 'next/server';
import { db, dbFehler } from '@/lib/db';
import { adminGeprueft } from '@/lib/admin-auth';
import { berechneStatistik, type SitzungFuerStatistik } from '@/lib/statistik';

export async function GET(req: Request) {
  if (!adminGeprueft(req)) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  const { data, error } = await db.from('wb_sessions').select('status,test,created_at,gestartet_at,abgeschlossen_at,fragen_snapshot,antworten,diktate');
  if (error) return dbFehler('statistik', error, 'Statistik konnte nicht geladen werden.');
  return NextResponse.json(berechneStatistik(data as SitzungFuerStatistik[]));
}
