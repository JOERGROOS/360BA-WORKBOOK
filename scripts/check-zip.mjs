import assert from 'node:assert/strict';
import { crc32 } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const { zipStoreStream } = await import('../lib/zip.ts');

async function sammeln(stream) {
  const teile = [];
  for await (const chunk of stream) teile.push(Buffer.from(chunk));
  return Buffer.concat(teile);
}

const einsDaten = Buffer.from('Hallo Welt äöü');
const zweiDaten = Buffer.from('Zweite Datei');
const zip = await sammeln(zipStoreStream([
  { name: 'eins.txt', daten: async () => einsDaten },
  { name: 'ordner/zwei.txt', daten: async () => zweiDaten },
]));

// Signaturen an bekannten Stellen: zwei lokale Header hintereinander am Anfang.
assert.equal(zip.readUInt32LE(0), 0x04034b50, 'erster lokaler Header');
const naechsterLokal = zip.indexOf(Buffer.from([0x50, 0x4b, 0x03, 0x04]), 4);
assert.ok(naechsterLokal > 0, 'zweiter lokaler Header vorhanden');
const zentralOffset = zip.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
assert.ok(zentralOffset > naechsterLokal, 'zentraler Ordner nach den Dateien');
const endeOffset = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
assert.ok(endeOffset > zentralOffset, 'End-Record nach dem zentralen Ordner');

// End-Record: Eintragszahl = 2
const anzahl = zip.readUInt16LE(endeOffset + 10);
assert.equal(anzahl, 2, 'zwei Einträge im End-Record');

// CRC des ersten Eintrags im lokalen Header = zlib.crc32(daten)
const crcErsterEintrag = zip.readUInt32LE(14);
assert.equal(crcErsterEintrag, crc32(einsDaten), 'CRC32 des ersten Eintrags stimmt');

// unzip -l muss die Datei lesen können und beide Namen zeigen (macOS-Bordmittel).
const tmp = mkdtempSync(path.join(os.tmpdir(), 'check-zip-'));
const zipPfad = path.join(tmp, 'test.zip');
writeFileSync(zipPfad, zip);
const liste = execFileSync('unzip', ['-l', zipPfad], { encoding: 'utf8' });
assert.ok(liste.includes('eins.txt'), 'unzip -l zeigt eins.txt');
assert.ok(liste.includes('ordner/zwei.txt'), 'unzip -l zeigt ordner/zwei.txt');
rmSync(tmp, { recursive: true, force: true });

console.log('ok');
