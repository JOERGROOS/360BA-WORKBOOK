// Prüft die PDF-Erzeugung gegen einen laufenden Dev-Server (npm run dev),
// weil node --experimental-strip-types kein TSX/JSX aus lib/pdf importieren kann.
// Abweichung vom Brief: statt direktem Import läuft die Erzeugung über
// GET /api/dev/pdf-probe (nur außerhalb von production erreichbar).
import { writeFileSync, mkdirSync } from 'node:fs';

const url = process.env.PDF_PROBE_URL ?? 'http://localhost:3000/api/dev/pdf-probe';
const t0 = Date.now();
const res = await fetch(url);
if (!res.ok) throw new Error(`Probe-Route antwortet mit ${res.status}`);
const buf = Buffer.from(await res.arrayBuffer());

mkdirSync('docs/beispiel', { recursive: true });
writeFileSync('docs/beispiel/beispiel.pdf', buf);

if (buf.length < 100_000) throw new Error(`PDF zu klein: ${buf.length}`);

// react-pdf packt Seiten oft in Object-Streams — /Type /Page taucht dann nicht direkt auf.
// Fallback: /Type /Pages trägt /Count N mit der echten Seitenzahl.
const text = buf.toString('latin1');
let seiten = (text.match(/\/Type\s*\/Page[^s]/g) ?? []).length;
let quelle = '/Type /Page';
if (seiten === 0) {
  const count = text.match(/\/Type\s*\/Pages[^>]*\/Count\s+(\d+)/) ?? text.match(/\/Count\s+(\d+)[^>]*\/Type\s*\/Pages/);
  if (count) { seiten = Number(count[1]); quelle = '/Type /Pages · /Count (Object-Streams verstecken /Type /Page)'; }
}
if (seiten < 14) throw new Error(`zu wenig Seiten: ${seiten} (Quelle: ${quelle})`);

console.log(`ok · ${seiten} Seiten (${quelle}) · ${Math.round(buf.length / 1024)} KB · ${Date.now() - t0} ms`);
