import fs from 'node:fs';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import {
  Document, Packer, Paragraph, TextRun, ImageRun, Header, Footer, PageNumber,
  BorderStyle, TabStopType, TabStopPosition,
} from 'docx';
import type { Sitzung, Snapshot, SnapshotFrage, Antwort, Antworten, TabellenWert } from './db';

// Interne Management Summary nach jedem echten Kunden-Abschluss (Jörg-Auftrag 22.09.2026):
// eine KI-Analyse der Workbook-Antworten als Word-Datei, ausschließlich an controlling@ — der
// Kunde bekommt sie nie zu sehen. Läuft im Hintergrund über `after()` (siehe abschluss-Route),
// verzögert also die Bestätigung an den Kunden nicht.
//
// Diese Datei ist bewusst ohne eigene Projekt-Importe (wie lib/video.ts, lib/erinnerungen.ts) —
// deshalb steht die Faktor-Punkte-Rechnung hier als eigenständige Kopie von lib/punkte.ts statt
// als Import: `scripts/check-management-summary.mjs` lädt die Datei direkt mit `node`, das
// löst extensionslose Projekt-Importe (z. B. `from './punkte'`) nicht auf. Der eigentliche
// Versand-Ablauf (mit dem KI-Aufruf und dem Mail-Versand) steht getrennt in
// lib/management-summary-lauf.ts.

// Kopie von lib/punkte.ts (flach + die Skala-Summe je Faktor) — siehe Hinweis oben.
function flach(snapshot: Snapshot): { kapitel: Snapshot['kapitel'][number]; frage: SnapshotFrage }[] {
  return snapshot.kapitel.flatMap((kapitel) => kapitel.fragen.map((frage) => ({ kapitel, frage })));
}
function punkteJeFaktor(snapshot: Snapshot, antworten: Antworten): { titel: string; punkte: number }[] {
  return snapshot.kapitel
    .filter((k) => k.typ === 'faktor')
    .map((k) => {
      const skala = k.fragen.filter((f) => f.typ === 'skala');
      const summe = skala.reduce((s, f) => s + (typeof antworten[f.id] === 'number' ? (antworten[f.id] as number) : 0), 0);
      const maximum = skala.length * 10;
      return { titel: k.titel, punkte: maximum ? Math.round((summe / maximum) * 100) : 0, maximum };
    })
    .filter((w) => w.maximum > 0);
}

export type ManagementSummary = {
  kurzeinschaetzung: string;
  staerken: string[];
  schwaechen: string[];
  potenziale: string[];
  worauf_achten: string[];
  vermutete_themen: string[];
};

function formatiereAntwort(frage: SnapshotFrage, wert: Antwort | undefined): string {
  if (wert === undefined || wert === null || wert === '') return '(keine Antwort)';
  if (frage.typ === 'skala') return `${wert}/10`;
  if (frage.typ === 'tabelle') {
    const zeilen = Object.entries(wert as TabellenWert).flatMap(([zeile, spalten]) =>
      Object.entries(spalten).filter(([, v]) => String(v).trim() !== '').map(([spalte, v]) => `${zeile} ${spalte}: ${v}`));
    return zeilen.length ? zeilen.join('; ') : '(keine Angaben)';
  }
  return String(wert);
}

// Alle Antworten der Sitzung als ein Fließtext für die Analyse — Kapitel für Kapitel, mit
// Aha-Moment und den Erfolgsfaktor-Punkten am Ende, damit die KI dieselbe Übersicht hat wie
// im Erfolgsrad.
export function sitzungAlsText(s: Pick<Sitzung, 'vorname' | 'firma' | 'fragen_snapshot' | 'antworten' | 'aha'>): string {
  const zeilen: string[] = [`Unternehmer: ${s.vorname} · Firma: ${s.firma}`];
  let kapitelTitel = '';
  for (const { kapitel, frage } of flach(s.fragen_snapshot)) {
    if (kapitel.titel !== kapitelTitel) { kapitelTitel = kapitel.titel; zeilen.push('', `## ${kapitelTitel}`); }
    zeilen.push(`- ${frage.text}: ${formatiereAntwort(frage, s.antworten[frage.id])}`);
  }
  if (s.aha) zeilen.push('', '## Aha-Moment (eigene Reflexion des Kunden)', s.aha);
  const faktoren = punkteJeFaktor(s.fragen_snapshot, s.antworten);
  if (faktoren.length) {
    zeilen.push('', '## Punkte je Erfolgsfaktor (von 100)');
    faktoren.forEach((f) => zeilen.push(`- ${f.titel}: ${f.punkte}`));
  }
  return zeilen.join('\n');
}

const SYSTEM = `Du bist ein erfahrener Business-Coach mit der besonderen Fähigkeit, zwischen den Zeilen zu lesen. Du bereitest für Jörg Roos und sein Team eine interne Management Summary zu den Antworten eines Handwerksunternehmers aus dessen 360°-Business-Analyse-Workbook vor — als Vorbereitung auf das persönliche Gespräch mit ihm.

Lies die Antworten aufmerksam und empathisch, auf den Menschen dahinter eingestellt. Formuliere klar, wertschätzend, auf den Punkt — kein Berater-Blabla, keine Floskeln, kein "man könnte", keine Plattitüden. Jede Aussage muss aus den konkreten Antworten erkennbar hergeleitet sein, nicht generisch für jeden Handwerksbetrieb passen.

Liefere:
- kurzeinschaetzung: Gesamteindruck in zwei bis drei Sätzen.
- staerken: was aus den Antworten klar für den Unternehmer und seinen Betrieb spricht.
- schwaechen: was riskant, ungeklärt oder schwach wirkt.
- potenziale: was ungenutzt bleibt, aber greifbar ist.
- worauf_achten: was das Team im Gespräch unbedingt ansprechen oder im Hinterkopf behalten sollte.
- vermutete_themen: was der Unternehmer vermutlich selbst kennt, sich aber noch nicht traut offen anzusprechen — erkennbar an Ton, Auslassungen, Widersprüchen, Ausweichen zwischen den Zeilen. Das ist deine Interpretation, keine belegte Tatsache — entsprechend vorsichtig, aber konkret formulieren, nicht vage.

Kurz und knapp, aber so ausführlich wie inhaltlich sinnvoll — lieber drei starke, konkrete Punkte je Abschnitt als zehn austauschbare. Sprich Jörg direkt mit "du" an, wo es passt. Nenne den Unternehmer beim Vornamen.

Format-Regel für die Listenfelder: mehrere eigenständige Stichpunkte statt einem einzigen, zusammengefassten — wo die Antworten es hergeben, drei bis fünf je Abschnitt, jeder Stichpunkt EIN zusammenhängender Satz oder kurzer Absatz, ohne Zeilenumbruch innerhalb des Textes, ohne Aufzählungszeichen und ohne Markup-Zeichen.`;

// Bei einem umfangreichen, dichten Antwortsatz (echter Kunde mit 91 beantworteten Fragen, mit
// vier aufeinanderfolgenden echten API-Aufrufen reproduziert — kein Einzelfall, sondern bei
// dieser Eingabegröße das REGELMÄSSIGE Verhalten) liefert das Modell die Listenfelder nicht als
// echtes JSON-Array, sondern als EINE Zeichenkette — keine Token-Grenze (stop_reason bleibt
// "tool_use"), einfach eine andere interne Formatierung, die durchrutscht. Beobachtete Formen:
// "<item>...</item>"-Markup, reine Zeilen ohne jedes Markup, und einmal eine führende
// Platzhalter-Zeile "<UNKNOWN>" vor den echten Zeilen. Alle drei werden hier in eine echte
// Liste zurückverwandelt, bevor überhaupt geprüft wird — ein erneuter Versuch allein würde bei
// dieser Eingabegröße nichts bringen, das Verhalten ist regelmäßig, nicht zufällig.
function alsListe(wert: unknown, feld: string): string[] {
  if (Array.isArray(wert)) return wert.map((w) => String(w).trim()).filter((w) => w.length > 0);
  if (typeof wert === 'string') {
    // Nicht auf "<item>" festgelegt — beobachtet wurden auch feld-spezifische Tag-Namen wie
    // "<staerke>" (Einzahl von "staerken"). Ein generisches Tag-Paar mit Rückverweis passt auf
    // jeden Namen, solange öffnendes und schließendes Tag übereinstimmen.
    const mitMarkup = Array.from(wert.matchAll(/<(\w+)>([\s\S]*?)<\/\1>/g)).map((m) => m[2].trim()).filter((t) => t.length > 0);
    if (mitMarkup.length > 0) return mitMarkup;
    const zeilenweise = wert.split('\n').map((z) => z.trim()).filter((z) => z.length > 0 && !/^<[A-Za-z_]+>$/.test(z));
    if (zeilenweise.length > 0) return zeilenweise;
  }
  throw new Error(`Management Summary: ${feld} hat kein brauchbares Format`);
}

export function pruefeSummary(x: unknown): ManagementSummary {
  const roh = x as Record<string, unknown>;
  if (typeof roh.kurzeinschaetzung !== 'string' || roh.kurzeinschaetzung.trim().length === 0) {
    throw new Error('Management Summary: kurzeinschaetzung fehlt oder ist leer');
  }
  const listen = ['staerken', 'schwaechen', 'potenziale', 'worauf_achten', 'vermutete_themen'] as const;
  const aus = { kurzeinschaetzung: roh.kurzeinschaetzung.trim() } as ManagementSummary;
  for (const k of listen) {
    const liste = alsListe(roh[k], k);
    for (const eintrag of liste) {
      if (eintrag.length === 0) throw new Error(`Management Summary: ${k} enthält einen leeren Stichpunkt`);
    }
    aus[k] = liste;
  }
  return aus;
}

const SCHEMA = {
  type: 'object' as const,
  properties: {
    kurzeinschaetzung: { type: 'string' },
    staerken: { type: 'array', items: { type: 'string' } },
    schwaechen: { type: 'array', items: { type: 'string' } },
    potenziale: { type: 'array', items: { type: 'string' } },
    worauf_achten: { type: 'array', items: { type: 'string' } },
    vermutete_themen: { type: 'array', items: { type: 'string' } },
  },
  required: ['kurzeinschaetzung', 'staerken', 'schwaechen', 'potenziale', 'worauf_achten', 'vermutete_themen'],
};

async function einAnalyseVersuch(text: string): Promise<unknown> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const r = await client.messages.create({
    model: 'claude-sonnet-5',
    // 3000 hat sich in der Praxis als zu knapp erwiesen: bei sechs Feldern mit mehreren
    // Stichpunkten je Feld bricht die strukturierte Antwort sonst mitten im JSON ab (leere
    // "<UNKNOWN>"-Platzhalter statt echter Stichpunkte). 6000 gibt spürbar Luft.
    max_tokens: 6000,
    // Kein `temperature` hier — das Modell lehnt den Parameter mit 400 ab ("deprecated for
    // this model"), anders als das ältere Haiku in lib/glaettung.ts.
    system: SYSTEM,
    messages: [{ role: 'user', content: text }],
    tools: [{ name: 'management_summary', description: 'Die strukturierte Management Summary', input_schema: SCHEMA }],
    tool_choice: { type: 'tool', name: 'management_summary' },
  });
  const werkzeug = r.content.find((c) => c.type === 'tool_use');
  if (!werkzeug || werkzeug.type !== 'tool_use') throw new Error('Keine strukturierte Antwort von Claude erhalten');
  return werkzeug.input;
}

export async function analysiere(s: Pick<Sitzung, 'vorname' | 'firma' | 'fragen_snapshot' | 'antworten' | 'aha'>): Promise<ManagementSummary> {
  const text = sitzungAlsText(s);
  try {
    return pruefeSummary(await einAnalyseVersuch(text));
  } catch (e) {
    console.warn('[management-summary] erster Versuch missglückt, ein zweiter läuft', e);
    return pruefeSummary(await einAnalyseVersuch(text));
  }
}

export function managementSummaryDateiname(s: Pick<Sitzung, 'nachname'>): string {
  const name = s.nachname.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'Kunde';
  return `Management-Summary-${name}-${new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' })}.docx`;
}

// CI-Farben, dieselben Werte wie im Kunden-PDF (lib/pdf/Workbook.tsx). docx will Hex ohne '#'.
const O = 'ED7A02', BLAU = '0F1B23', GRAU = '5F676C', LINIE = 'E2E6E9';
const SCHRIFT = 'Montserrat';

// Logo in Original-Proportion (7,87 : 1, siehe ci-design.md) — nie Breite und Höhe unabhängig
// setzen. Wie lib/pdf/render.ts liest das direkt aus public/, läuft serverseitig (Node-Laufzeit).
function logoBild(): ImageRun | null {
  try {
    const bytes = fs.readFileSync(path.join(process.cwd(), 'public', 'logo-full.png'));
    const breite = 130;
    return new ImageRun({ type: 'png', data: bytes, transformation: { width: breite, height: Math.round(breite / 7.87) } });
  } catch {
    return null; // Fehlt die Datei aus irgendeinem Grund, bleibt der Kopf eben ohne Logo statt die ganze Datei scheitern zu lassen.
  }
}

function kopfzeile(): Header {
  const logo = logoBild();
  return new Header({
    children: [
      new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: LINIE, space: 8 } },
        children: [
          ...(logo ? [logo] : [new TextRun({ text: 'JOERG ROOS', bold: true, color: BLAU, font: SCHRIFT })]),
          new TextRun({ text: '\tMANAGEMENT SUMMARY · INTERN', color: GRAU, size: 15, font: SCHRIFT, characterSpacing: 20 }),
        ],
      }),
    ],
  });
}

function fusszeile(): Footer {
  return new Footer({
    children: [
      new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        children: [
          new TextRun({ text: `Copyright © ${new Date().getFullYear()} · Jörg Roos`, color: GRAU, size: 15, font: SCHRIFT }),
          new TextRun({ text: '\tSeite ', color: GRAU, size: 15, font: SCHRIFT }),
          new TextRun({ children: [PageNumber.CURRENT], color: GRAU, size: 15, font: SCHRIFT }),
        ],
      }),
    ],
  });
}

// Kleine, orange, großgeschriebene Label-Zeile — dieselbe Rolle wie `st.eyebrow` im PDF.
function eyebrow(text: string): Paragraph {
  return new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: text.toUpperCase(), color: O, bold: true, size: 17, font: SCHRIFT, characterSpacing: 20 })] });
}
function h2(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 300, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 3, color: O, space: 4 } },
    children: [new TextRun({ text, bold: true, color: BLAU, size: 24, font: SCHRIFT })],
  });
}
function absatz(text: string, optionen: { italic?: boolean; farbe?: string } = {}): Paragraph {
  return new Paragraph({ spacing: { after: 140 }, children: [new TextRun({ text, italics: optionen.italic, color: optionen.farbe ?? BLAU, size: 21, font: SCHRIFT })] });
}
function punktListe(punkte: string[]): Paragraph[] {
  return punkte.length
    ? punkte.map((p) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 90 }, children: [new TextRun({ text: p, color: BLAU, size: 21, font: SCHRIFT })] }))
    : [absatz('—', { farbe: GRAU })];
}
function abschnitt(titel: string, punkte: string[]): Paragraph[] {
  return [h2(titel), ...punktListe(punkte)];
}

export async function docxErzeugen(z: ManagementSummary, meta: { vorname: string; nachname: string; firma: string; terminAm: string | null }): Promise<Buffer> {
  const termin = meta.terminAm ? new Date(meta.terminAm).toLocaleDateString('de-DE') : null;
  const doc = new Document({
    styles: { default: { document: { run: { font: SCHRIFT, size: 21, color: BLAU } } } },
    sections: [{
      properties: { page: { margin: { top: 900, bottom: 900, left: 1000, right: 1000 } } },
      headers: { default: kopfzeile() },
      footers: { default: fusszeile() },
      children: [
        eyebrow('360° Business-Analyse'),
        new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'Management Summary', bold: true, color: BLAU, size: 42, font: SCHRIFT })] }),
        new Paragraph({
          spacing: { after: termin ? 60 : 260 },
          children: [new TextRun({ text: `${meta.vorname} ${meta.nachname} · ${meta.firma}`, bold: true, color: O, size: 24, font: SCHRIFT })],
        }),
        ...(termin ? [new Paragraph({ spacing: { after: 260 }, children: [new TextRun({ text: `Termin vor Ort: ${termin}`, italics: true, color: GRAU, size: 19, font: SCHRIFT })] })] : []),
        h2('Kurzeinschätzung'),
        absatz(z.kurzeinschaetzung),
        ...abschnitt('Stärken', z.staerken),
        ...abschnitt('Schwächen & Risiken', z.schwaechen),
        ...abschnitt('Potenziale', z.potenziale),
        ...abschnitt('Worauf ihr im Gespräch achten solltet', z.worauf_achten),
        h2('Vermutete, noch unausgesprochene Themen'),
        absatz('⚠ Interpretation zwischen den Zeilen, keine belegte Tatsache — als Gesprächs-Antenne gedacht, nicht als Vorwurf.', { italic: true, farbe: GRAU }),
        ...punktListe(z.vermutete_themen),
      ],
    }],
  });
  return Packer.toBuffer(doc);
}
