import Anthropic from '@anthropic-ai/sdk';
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from 'docx';
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

Kurz und knapp, aber so ausführlich wie inhaltlich sinnvoll — lieber drei starke, konkrete Punkte je Abschnitt als zehn austauschbare. Sprich Jörg direkt mit "du" an, wo es passt. Nenne den Unternehmer beim Vornamen.`;

function pruefeSummary(x: unknown): ManagementSummary {
  const s = x as Partial<ManagementSummary>;
  const listen: (keyof ManagementSummary)[] = ['staerken', 'schwaechen', 'potenziale', 'worauf_achten', 'vermutete_themen'];
  if (typeof s.kurzeinschaetzung !== 'string' || !listen.every((k) => Array.isArray(s[k]))) {
    throw new Error('Management Summary hat nicht die erwartete Form');
  }
  return s as ManagementSummary;
}

export async function analysiere(s: Pick<Sitzung, 'vorname' | 'firma' | 'fragen_snapshot' | 'antworten' | 'aha'>): Promise<ManagementSummary> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const schema = {
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
  const r = await client.messages.create({
    model: 'claude-sonnet-5',
    // 3000 hat sich in der Praxis als zu knapp erwiesen: bei sechs Feldern mit mehreren
    // Stichpunkten je Feld bricht die strukturierte Antwort sonst mitten im JSON ab (leere
    // "<UNKNOWN>"-Platzhalter statt echter Stichpunkte). 6000 gibt spürbar Luft.
    max_tokens: 6000,
    // Kein `temperature` hier — das Modell lehnt den Parameter mit 400 ab ("deprecated for
    // this model"), anders als das ältere Haiku in lib/glaettung.ts.
    system: SYSTEM,
    messages: [{ role: 'user', content: sitzungAlsText(s) }],
    tools: [{ name: 'management_summary', description: 'Die strukturierte Management Summary', input_schema: schema }],
    tool_choice: { type: 'tool', name: 'management_summary' },
  });
  const werkzeug = r.content.find((c) => c.type === 'tool_use');
  if (!werkzeug || werkzeug.type !== 'tool_use') throw new Error('Keine strukturierte Antwort von Claude erhalten');
  return pruefeSummary(werkzeug.input);
}

export function managementSummaryDateiname(s: Pick<Sitzung, 'nachname'>): string {
  const name = s.nachname.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'Kunde';
  return `Management-Summary-${name}-${new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' })}.docx`;
}

function abschnitt(titel: string, punkte: string[]): Paragraph[] {
  return [
    new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 120 }, children: [new TextRun({ text: titel, bold: true })] }),
    ...(punkte.length ? punkte.map((p) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 60 }, children: [new TextRun({ text: p })] }))
      : [new Paragraph({ children: [new TextRun({ text: '—', italics: true })] })]),
  ];
}

export async function docxErzeugen(z: ManagementSummary, meta: { vorname: string; nachname: string; firma: string; terminAm: string | null }): Promise<Buffer> {
  const termin = meta.terminAm ? new Date(meta.terminAm).toLocaleDateString('de-DE') : null;
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({ heading: HeadingLevel.TITLE, spacing: { after: 80 }, children: [new TextRun({ text: 'Management Summary · 360° Business-Analyse' })] }),
        new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: `${meta.vorname} ${meta.nachname} · ${meta.firma}`, bold: true, size: 24 })] }),
        ...(termin ? [new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: `Termin vor Ort: ${termin}`, italics: true })] })] : [new Paragraph({ spacing: { after: 200 }, children: [] })]),
        new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { after: 120 }, children: [new TextRun({ text: 'Kurzeinschätzung', bold: true })] }),
        new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: z.kurzeinschaetzung })] }),
        ...abschnitt('Stärken', z.staerken),
        ...abschnitt('Schwächen & Risiken', z.schwaechen),
        ...abschnitt('Potenziale', z.potenziale),
        ...abschnitt('Worauf ihr im Gespräch achten solltet', z.worauf_achten),
        new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 60 }, children: [new TextRun({ text: 'Vermutete, noch unausgesprochene Themen', bold: true })] }),
        new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: '⚠ Interpretation zwischen den Zeilen, keine belegte Tatsache — als Gesprächs-Antenne gedacht, nicht als Vorwurf.', italics: true })] }),
        ...(z.vermutete_themen.length ? z.vermutete_themen.map((p) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 60 }, children: [new TextRun({ text: p })] }))
          : [new Paragraph({ children: [new TextRun({ text: '—', italics: true })] })]),
      ],
    }],
  });
  return Packer.toBuffer(doc);
}
