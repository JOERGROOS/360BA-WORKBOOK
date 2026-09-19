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
  return `360BA-Workbook-${name}-${new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' })}.pdf`;
}

// Zwei Durchläufe: react-pdf kennt die Seitenzahl eines Abschnitts erst beim
// Umbruch. Durchlauf 1 rendert nur, damit die <Marke>-Elemente per
// render={({pageNumber})} in die Karte schreiben, auf welcher Seite ihr
// Abschnitt landet. Durchlauf 2 rendert dasselbe Dokument mit gefüllter Karte —
// erst dort stehen die Seitenzahlen im Inhaltsverzeichnis. Nur dieses Ergebnis
// wird ausgeliefert. Die Zeilen des Verzeichnisses haben eine feste Höhe und
// eine Zahlenspalte fester Breite, dadurch verschiebt sich zwischen den beiden
// Durchläufen nichts.
export async function pdfErzeugen(s: Sitzung, texte: Record<string, string>): Promise<Buffer> {
  schriftenRegistrieren();
  const seiten = new Map<string, number>();
  await renderToBuffer(Workbook({ s, texte, seiten }));
  return Buffer.from(await renderToBuffer(Workbook({ s, texte, seiten })));
}
