// Baut ein ZIP ohne Kompression (Store, Methode 0) als Web-ReadableStream — reine Funktion,
// keine Abhängigkeit außer node:zlib (CRC32). Erasable TS: `scripts/check-zip.mjs` importiert
// diese Datei direkt mit `node`, ohne Build-Schritt.
import { crc32 } from 'node:zlib';

export type ZipEintrag = { name: string; daten: () => Promise<Uint8Array> };

const SIG_LOKAL = 0x04034b50;
const SIG_ZENTRAL = 0x02014b50;
const SIG_ENDE = 0x06054b50;
const UTF8_FLAG = 0x0800; // Bit 11: Datei- und Kommentarname sind UTF-8

function u16(n: number): Buffer {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(n);
  return b;
}
function u32(n: number): Buffer {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n);
  return b;
}

// DOS-Zeit/Datum fürs ZIP-Format (Sekunden nur auf 2er-Schritte genau — Format-Grenze, kein Bug).
function dosZeitDatum(d: Date): { zeit: number; datum: number } {
  const zeit = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const datum = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { zeit, datum };
}

// Gleicher Namenskonflikt-Trick wie im Abholer (`freierPfad` in
// scripts/finanzdaten-abholen.mjs): zwei Einträge mit demselben Namen würden sich sonst im
// ZIP gegenseitig überschreiben (die meisten Entpacker zeigen nur den letzten). Zweiter
// Treffer bekommt `-2`, dritter `-3`, ...
function eindeutigeNamen(eintraege: ZipEintrag[]): string[] {
  const vergeben = new Set<string>();
  return eintraege.map((e) => {
    const punkt = e.name.lastIndexOf('.');
    const ext = punkt === -1 ? '' : e.name.slice(punkt);
    const basis = punkt === -1 ? e.name : e.name.slice(0, punkt);
    let name = e.name;
    for (let i = 2; vergeben.has(name); i++) name = `${basis}-${i}${ext}`;
    vergeben.add(name);
    return name;
  });
}

export function zipStoreStream(eintraege: ZipEintrag[]): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const { zeit, datum } = dosZeitDatum(new Date());
      const namen = eindeutigeNamen(eintraege);
      const zentral: Buffer[] = [];
      let offset = 0;
      for (let i = 0; i < eintraege.length; i++) {
        const eintrag = eintraege[i];
        const name = Buffer.from(namen[i], 'utf8');
        const daten = Buffer.from(await eintrag.daten());
        const crc = crc32(daten);
        const groesse = u32(daten.length);
        const lokalHeader = Buffer.concat([
          u32(SIG_LOKAL), u16(20), u16(UTF8_FLAG), u16(0), u16(zeit), u16(datum),
          u32(crc), groesse, groesse, u16(name.length), u16(0), name,
        ]);
        controller.enqueue(lokalHeader);
        controller.enqueue(daten);
        zentral.push(Buffer.concat([
          u32(SIG_ZENTRAL), u16(20), u16(20), u16(UTF8_FLAG), u16(0), u16(zeit), u16(datum),
          u32(crc), groesse, groesse, u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0),
          u32(offset), name,
        ]));
        offset += lokalHeader.length + daten.length;
      }
      const zentralBuf = Buffer.concat(zentral);
      controller.enqueue(zentralBuf);
      controller.enqueue(Buffer.concat([
        u32(SIG_ENDE), u16(0), u16(0), u16(eintraege.length), u16(eintraege.length),
        u32(zentralBuf.length), u32(offset), u16(0),
      ]));
      controller.close();
    },
  });
}

// Sammelt den Stream vollständig in einen Buffer — für Fälle, in denen erst alles fertig
// im Speicher liegen soll, bevor überhaupt eine Antwort beginnt (kein Mitten-im-Stream-Abbruch
// mehr möglich).
export async function zipStoreBuffer(eintraege: ZipEintrag[]): Promise<Buffer> {
  // `getReader()` statt `for await`: der DOM-Typ von ReadableStream (den tsc hier zieht)
  // deklariert kein Symbol.asyncIterator, obwohl Node es zur Laufzeit unterstützt.
  const reader = zipStoreStream(eintraege).getReader();
  const teile: Buffer[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    teile.push(Buffer.from(value));
  }
  return Buffer.concat(teile);
}
