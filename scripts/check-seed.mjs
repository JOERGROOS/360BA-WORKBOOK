import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const s = JSON.parse(readFileSync(new URL('../data/fragen-seed.json', import.meta.url), 'utf8'));
const t = JSON.parse(readFileSync(new URL('../data/texte-seed.json', import.meta.url), 'utf8'));
assert.equal(s.kapitel.length, 8, '8 Kapitel');
const faktoren = s.kapitel.filter((k) => k.typ === 'faktor');
assert.equal(faktoren.length, 7, '7 Faktoren');
for (const k of faktoren) { assert.equal(k.fragen.length, 10, `${k.titel}: 10 Aussagen`); assert.ok(k.fragen.every((f) => f.typ === 'skala'), `${k.titel}: nur Skala`); assert.ok(k.einleitung.length > 50); }
const fakten = s.kapitel[0];
assert.equal(fakten.typ, 'fakten');
assert.ok(fakten.fragen.length >= 22);
assert.equal(fakten.fragen.filter((f) => f.typ === 'tabelle').length, 1);
for (const k of s.kapitel) for (const f of k.fragen) { assert.ok(f.text.trim().length > 5, 'Fragetext leer'); if (f.typ === 'tabelle') assert.ok(f.optionen.zeilen.length && f.optionen.spalten.length); }
const verboten = /\b(vielleicht|könnte|man sollte|häufig|gefühlt|eventuell|ganzheitlich|garantiert|Fixkosten)\b/i;
for (const [k, v] of Object.entries(t)) assert.ok(!verboten.test(v), `verbotenes Wort in Text ${k}`);
for (const k of s.kapitel) for (const f of k.fragen) assert.ok(!verboten.test(f.text + ' ' + (f.hinweis ?? '')), `verbotenes Wort in Frage: ${f.text}`);
for (const key of ['zugang_text','einladung_titel','einladung_text','kacheln_titel','kachel_workbook','kachel_finanzdaten','upload_hinweis','willkommen_text','bestandteile_text','finanzcheck_liste','faktoren_einleitung','ergebnis_text','aha_frage','ueber_text','mail_link_text','mail_fertig_text']) assert.ok(t[key], `Text ${key} fehlt`);
console.log('ok');
