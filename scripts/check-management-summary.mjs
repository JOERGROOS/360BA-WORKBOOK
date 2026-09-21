import assert from 'node:assert/strict';
const { sitzungAlsText, docxErzeugen, managementSummaryDateiname } = await import('../lib/management-summary.ts');

// Text-Aufbereitung: Kapitel-Überschriften, Frage-Antwort-Zeilen, Skala als "x/10", Aha-Moment.
const snapshot = {
  erstellt: '2026-01-01',
  kapitel: [
    {
      id: 'k1', titel: 'Unternehmerpersönlichkeit', untertitel: '', einleitung: '', typ: 'faktor',
      fragen: [
        { id: 'f1', typ: 'skala', text: 'Ich weiß immer, wo ich stehe', hinweis: '' },
        { id: 'f2', typ: 'text', text: 'Was treibt dich an?', hinweis: '' },
      ],
    },
  ],
};
const antworten = { f1: 7, f2: 'Meine Mitarbeiter sollen stolz auf ihre Arbeit sein.' };
const text = sitzungAlsText({ vorname: 'Max', firma: 'Muster GmbH', fragen_snapshot: snapshot, antworten, aha: 'Ich merke, dass ich zu wenig delegiere.' });
assert.match(text, /Unternehmer: Max · Firma: Muster GmbH/);
assert.match(text, /## Unternehmerpersönlichkeit/);
assert.match(text, /Ich weiß immer, wo ich stehe: 7\/10/);
assert.match(text, /Was treibt dich an\?: Meine Mitarbeiter sollen stolz auf ihre Arbeit sein\./);
assert.match(text, /## Aha-Moment.*\nIch merke, dass ich zu wenig delegiere\./s);
assert.match(text, /## Punkte je Erfolgsfaktor.*\n- Unternehmerpersönlichkeit: 70/s);

// Unbeantwortete Frage wird ausgewiesen, nicht stillschweigend weggelassen (sonst könnte die
// Analyse eine Lücke für eine bewusste Antwort halten).
const textLeer = sitzungAlsText({ vorname: 'Max', firma: 'Muster GmbH', fragen_snapshot: snapshot, antworten: { f1: 7 }, aha: '' });
assert.match(textLeer, /Was treibt dich an\?: \(keine Antwort\)/);
assert.doesNotMatch(textLeer, /Aha-Moment/, 'ohne aha-Text kein leerer Abschnitt');

// Dateiname: Umlaute raus, Datumsstempel drin (gleiche Regel wie pdfDateiname in lib/pdf/render.ts —
// „ß" hat keine NFD-Zerlegung und fällt wie dort weg, das ist die bekannte, übernommene Grenze).
assert.match(managementSummaryDateiname({ nachname: 'Müller-Groß' }), /^Management-Summary-Muller-Gro-\d{4}-\d{2}-\d{2}\.docx$/);

// Word-Datei ist ein echtes .docx (ZIP-Container, beginnt mit der PK-Signatur) — ohne
// Netzwerk-Aufruf prüfbar, weil docxErzeugen selbst keine KI braucht.
const zusammenfassung = {
  kurzeinschaetzung: 'Testfall.',
  staerken: ['Klar strukturiert.'],
  schwaechen: [],
  potenziale: ['Delegation ausbauen.'],
  worauf_achten: ['Nachfragen, wie Entscheidungen im Team laufen.'],
  vermutete_themen: [],
};
const buffer = await docxErzeugen(zusammenfassung, { vorname: 'Max', nachname: 'Muster', firma: 'Muster GmbH', terminAm: null });
assert.ok(Buffer.isBuffer(buffer) && buffer.length > 500, 'Word-Datei sollte eine echte, nicht-triviale Datei sein');
assert.equal(buffer.subarray(0, 2).toString('latin1'), 'PK', 'ein .docx ist ein ZIP-Container und beginnt mit der PK-Signatur');

console.log('ok');
