import path from 'node:path';
import { Font, renderToBuffer } from '@react-pdf/renderer';
import { Workbook } from './Workbook';
import type { Sitzung } from '@/lib/db';

let registriert = false;
export function schriftenRegistrieren() {
  if (registriert) return;
  const f = (n: string) => path.join(process.cwd(), 'public', 'fonts', n);
  Font.register({
    family: 'Montserrat',
    fonts: [
      { src: f('Montserrat-Light.ttf'), fontWeight: 300 },
      { src: f('Montserrat-Regular.ttf'), fontWeight: 400 },
      { src: f('Montserrat-Medium.ttf'), fontWeight: 500 },
      { src: f('Montserrat-SemiBold.ttf'), fontWeight: 600 },
    ],
  });
  Font.registerHyphenationCallback((w) => [w]);
  registriert = true;
}

export function pdfDateiname(s: Sitzung): string {
  const name = s.nachname.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'Kunde';
  return `360BA-Workbook-${name}-${new Date().toISOString().slice(0, 10)}.pdf`;
}

export async function pdfErzeugen(s: Sitzung, texte: Record<string, string>): Promise<Buffer> {
  schriftenRegistrieren();
  return Buffer.from(await renderToBuffer(Workbook({ s, texte })));
}
