import assert from 'node:assert/strict';
const { tageBisTermin, faelligeStufe, fehlendeUnterlagen } = await import('../lib/erinnerungen.ts');

// Tage-Rechnung, mit festem "heute" statt der echten Uhrzeit.
assert.equal(tageBisTermin('2026-10-03', '2026-09-19'), 14);
assert.equal(tageBisTermin('2026-09-29', '2026-09-19'), 10);
assert.equal(tageBisTermin('2026-09-26', '2026-09-19'), 7);
assert.equal(tageBisTermin('2026-09-19', '2026-09-19'), 0);
assert.equal(tageBisTermin('2026-09-10', '2026-09-19'), -9, 'Termin liegt in der Vergangenheit');
// Jahreswechsel und Zeitumstellung dürfen die Kalendertage nicht verschieben.
assert.equal(tageBisTermin('2027-01-05', '2026-12-29'), 7);
assert.equal(tageBisTermin('2026-11-01', '2026-10-24'), 8, 'Umstellung auf Winterzeit Ende Oktober');

const nichtsGesendet = { erinnerung_14_gesendet_at: null, erinnerung_10_gesendet_at: null, erinnerung_7_gesendet_at: null };

// Frisch eingetragener Termin weit voraus → noch keine Stufe fällig.
assert.equal(faelligeStufe(20, nichtsGesendet), null);
// Genau an der Schwelle → die jeweilige Stufe, geprüft von der dringendsten (7) her.
assert.equal(faelligeStufe(14, nichtsGesendet), 14);
assert.equal(faelligeStufe(9, nichtsGesendet), 10, 'nicht mehr 14 (überholt), aber 10 passt noch zur Wirklichkeit');
assert.equal(faelligeStufe(7, nichtsGesendet), 7);
assert.equal(faelligeStufe(0, nichtsGesendet), 7, 'am Tag selbst greift noch die dringendste Stufe');
// Vergangener Termin: nie mehr etwas nachschicken.
assert.equal(faelligeStufe(-1, nichtsGesendet), null);

// Jeder Lauf liefert höchstens EINE fällige Stufe — nie mehrere Mails am selben Tag.
assert.equal(faelligeStufe(5, { ...nichtsGesendet, erinnerung_14_gesendet_at: '2026-09-01T00:00:00Z', erinnerung_10_gesendet_at: '2026-09-05T00:00:00Z' }), 7, 'nur die letzte offene Stufe, 14 und 10 sind schon draußen');
// Ist eine Stufe schon gesendet, überspringt sie der nächste Lauf, auch wenn ihre Schwelle erneut zuträfe.
assert.equal(faelligeStufe(14, { ...nichtsGesendet, erinnerung_14_gesendet_at: '2026-09-01T00:00:00Z' }), null, 'termin liegt noch 14 Tage weg, aber diese Stufe ist schon gesendet');
// Ein Termin, der spät erst 8 Tage vorher eingetragen wird: die 10er-Stufe geht raus, nicht die
// überholte 14er (deren „in 14 Tagen“-Text zu den echten 8 verbleibenden Tagen nicht mehr passt).
assert.equal(faelligeStufe(8, nichtsGesendet), 10);
// Sind bereits alle drei Stufen gesendet, ist der Lauf für diese Sitzung fertig.
assert.equal(faelligeStufe(3, { erinnerung_14_gesendet_at: 'x', erinnerung_10_gesendet_at: 'x', erinnerung_7_gesendet_at: 'x' }), null);

// Beides fehlt → generische Erinnerung. Nur eine Sache fehlt → gezielte Erinnerung auf
// genau diese Sache. Beides da → gar keine Erinnerung mehr, unabhängig von der Stufe.
assert.equal(fehlendeUnterlagen(true, true), 'beide');
assert.equal(fehlendeUnterlagen(true, false), 'workbook', 'Finanzdaten sind da, nur das Workbook fehlt noch');
assert.equal(fehlendeUnterlagen(false, true), 'finanzdaten', 'Workbook ist fertig, nur die Finanzdaten fehlen noch');
assert.equal(fehlendeUnterlagen(false, false), null, 'beides liegt vor — keine weitere Erinnerung nötig');

console.log('ok');
