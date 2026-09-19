import assert from 'node:assert/strict';
const { berechneStatistik } = await import('../lib/statistik.ts');

// Snapshot mit genau zwei Faktor-Fragen (je Kapitel eine Skala-Frage, Maximum 10) —
// so ergibt eine beantwortete von zwei Fragen exakt 50 % Fortschritt.
const snap = { erstellt: '', kapitel: [
  { id: 'k1', titel: 'Finanzen', untertitel: '', typ: 'faktor', einleitung: '', fragen: [{ id: 'f1', typ: 'skala', text: 'F', hinweis: '' }] },
  { id: 'k2', titel: 'Team', untertitel: '', typ: 'faktor', einleitung: '', fragen: [{ id: 'f2', typ: 'skala', text: 'T', hinweis: '' }] },
] };

const abgeschlossenA = { status: 'abgeschlossen', test: false, created_at: '2026-01-01T09:00:00.000Z', gestartet_at: '2026-01-01T10:00:00.000Z', abgeschlossen_at: '2026-01-01T10:30:00.000Z', fragen_snapshot: snap, antworten: { f1: 8, f2: 4 }, diktate: 0 };
const abgeschlossenB = { status: 'abgeschlossen', test: false, created_at: '2026-01-01T09:00:00.000Z', gestartet_at: '2026-01-01T09:00:00.000Z', abgeschlossen_at: '2026-01-01T10:30:00.000Z', fragen_snapshot: snap, antworten: { f1: 6, f2: 9 }, diktate: 2 };
const laufend = { status: 'laufend', test: false, created_at: '2026-01-01T09:00:00.000Z', gestartet_at: '2026-01-01T09:00:00.000Z', abgeschlossen_at: null, fragen_snapshot: snap, antworten: { f1: 8 }, diktate: 1 };
const testSitzung = { status: 'abgeschlossen', test: true, created_at: '2026-01-01T09:00:00.000Z', gestartet_at: '2026-01-01T09:00:00.000Z', abgeschlossen_at: '2026-01-01T09:01:00.000Z', fragen_snapshot: snap, antworten: { f1: 10, f2: 10 }, diktate: 100 };

const s = berechneStatistik([abgeschlossenA, abgeschlossenB, laufend, testSitzung]);

assert.deepEqual(s.anzahl, { eingeladen: 0, laufend: 1, ergebnis: 0, abgeschlossen: 2, gesamt: 3 }, 'Test-Sitzung wird ausgeschlossen');
assert.deepEqual(s.dauerMinuten, { median: 60, mittel: 60, n: 2 }, '30 und 90 Minuten → Median 60');
assert.deepEqual(s.fortschrittLaufend, { mittelProzent: 50, n: 1 });
assert.deepEqual(s.faktoren, [{ titel: 'Finanzen', mittel: 70, n: 2 }, { titel: 'Team', mittel: 65, n: 2 }]);
assert.equal(s.schwaechster, 'Team');
assert.equal(s.staerkster, 'Finanzen');
assert.equal(s.diktatAnteil, 67, '2 von 3 genutzten Sitzungen haben mindestens ein Diktat');
assert.equal(s.diktateGesamt, 3, '0 + 2 + 1, Test-Sitzung zählt nicht mit');

console.log('ok');
