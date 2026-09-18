import assert from 'node:assert/strict';
const { punkteJeFaktor, fortschritt, flach } = await import('../lib/punkte.ts');
const snap = { erstellt: '', kapitel: [
  { id: 'k1', titel: 'Fakten', untertitel: '', typ: 'fakten', einleitung: '', fragen: [{ id: 'f1', typ: 'text', text: 'A', hinweis: '' }, { id: 'f2', typ: 'skala', text: 'Steuerberater', hinweis: '' }] },
  { id: 'k2', titel: 'Finanzen', untertitel: '', typ: 'faktor', einleitung: '', fragen: Array.from({ length: 10 }, (_, i) => ({ id: `s${i}`, typ: 'skala', text: `S${i}`, hinweis: '' })) },
  { id: 'k3', titel: 'Kurz', untertitel: '', typ: 'faktor', einleitung: '', fragen: [{ id: 'a', typ: 'skala', text: 'a', hinweis: '' }, { id: 'b', typ: 'skala', text: 'b', hinweis: '' }, { id: 'c', typ: 'text', text: 'c', hinweis: '' }] },
] };
const antworten = { f1: 'x', f2: 7, s0: 5, s1: 5, s2: 5, s3: 5, s4: 5, s5: 5, s6: 5, s7: 5, s8: 5, s9: 5, a: 10, b: 3 };
const w = punkteJeFaktor(snap, antworten);
assert.equal(w.length, 2, 'nur faktor-Kapitel');
assert.equal(w[0].punkte, 50); assert.equal(w[0].summe, 50); assert.equal(w[0].maximum, 100);
assert.equal(w[1].punkte, 65, '13/20 → 65'); assert.equal(w[1].maximum, 20);
assert.equal(punkteJeFaktor(snap, {})[0].punkte, 0);
assert.deepEqual(fortschritt(snap, antworten), { beantwortet: 14, gesamt: 15, prozent: 93 });
assert.deepEqual(fortschritt(snap, { f1: '   ' }).beantwortet, 0, 'leerer Text zählt nicht');
const fl = flach(snap);
assert.equal(fl.length, 15); assert.equal(fl[2].ersteImKapitel, true); assert.equal(fl[3].ersteImKapitel, false); assert.equal(fl[2].kapitel.id, 'k2');
console.log('ok');
