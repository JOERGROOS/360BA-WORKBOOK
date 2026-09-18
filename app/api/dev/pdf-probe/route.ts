import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { pdfErzeugen, pdfDateiname } from '@/lib/pdf/render';
import type { Sitzung } from '@/lib/db';

// Nur für lokale Prüfung (scripts/check-pdf.mjs): node kann kein TSX importieren,
// darum läuft die PDF-Erzeugung hier über den Dev-Server statt über einen Node-Import.
// In Produktion 404 — dieser Weg ist nie für echte Kunden gedacht.
export async function GET() {
  if (process.env.NODE_ENV === 'production') return new NextResponse(null, { status: 404 });

  const wurzel = process.cwd();
  const texte = JSON.parse(await readFile(path.join(wurzel, 'data', 'texte-seed.json'), 'utf8'));
  const s = JSON.parse(await readFile(path.join(wurzel, 'docs', 'beispiel', 'musterdaten.json'), 'utf8')) as Sitzung;

  const buf = await pdfErzeugen(s, texte);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${pdfDateiname(s)}"`,
    },
  });
}
