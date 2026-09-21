// Unterlagen-Checkliste: Kennungen, Zählung und die Aufteilung des Kacheltextes.
// Die Kennungen sind der Schlüssel in der Datenbank — ändert jemand eine, verlieren
// bestehende Kunden ihre Haken. Deshalb stehen sie hier fest.
import assert from 'node:assert/strict';
const { CHECKLISTE, CHECKLISTEN_IDS, istPunkt, stand, teileKacheltext } = await import('../lib/checkliste.ts');

assert.deepEqual(CHECKLISTEN_IDS, ['jahresabschluss', 'fixkosten', 'kontostand', 'bwa', 'susa'],
  'Kennungen geändert — bestehende Kunden verlieren damit ihre Haken');
assert.equal(CHECKLISTE.length, 5);
for (const p of CHECKLISTE) assert.ok(p.titel.trim().length > 10, `Punkt ohne Titel: ${p.id}`);

// Nur bekannte Kennungen dürfen in die Datenbank.
assert.equal(istPunkt('bwa'), true);
assert.equal(istPunkt('bwa2'), false);
assert.equal(istPunkt(''), false);
assert.equal(istPunkt(null), false);
assert.equal(istPunkt('__proto__'), false, 'Fremde Schlüssel müssen abgewiesen werden');

// Zählung
assert.deepEqual(stand({}), { erledigt: 0, gesamt: 5 });
assert.deepEqual(stand({ bwa: true, susa: true }), { erledigt: 2, gesamt: 5 });
assert.deepEqual(stand(null), { erledigt: 0, gesamt: 5 }, 'Sitzung ohne gesetzte Checkliste');
assert.deepEqual(stand({ bwa: false }), { erledigt: 0, gesamt: 5 }, 'Abgehakt und wieder abgewählt');
assert.deepEqual(stand({ altpunkt: true }), { erledigt: 0, gesamt: 5 }, 'Unbekannte Altlast darf nicht mitzählen');

// Aufteilung des Kacheltextes: Der Teil vor dem Gedankenstrich wird zum Link.
const echt = 'Jahresabschlüsse, Summen- und Saldenlisten, BWA und Kontostände – sicher verschlüsselt an das Team von JOERG ROOS. Wir werten sie vor unserem gemeinsamen Tag aus.';
const t = teileKacheltext(echt);
assert.equal(t.link, 'Jahresabschlüsse, Summen- und Saldenlisten, BWA und Kontostände');
assert.ok(t.rest.startsWith('–'));
// Ohne Gedankenstrich wird der ganze Text zum Link statt zu raten.
assert.deepEqual(teileKacheltext('Nur ein Satz ohne Trenner'), { link: 'Nur ein Satz ohne Trenner', rest: '' });
assert.deepEqual(teileKacheltext(''), { link: '', rest: '' });

console.log('ok');
