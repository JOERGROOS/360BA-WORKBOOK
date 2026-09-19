import assert from 'node:assert/strict';
const { endung, typErlaubt, dateinameSicher, ordnerName, ERLAUBT, MAX_BYTES, MAX_DATEIEN } = await import('../lib/dateinamen.ts');

// Endungs-/Typ-Prüfung
assert.equal(endung('bwa.PDF'), '.pdf', 'Endung wird kleingeschrieben');
assert.equal(endung('ohne-endung'), '', 'keine Endung → leer');
assert.equal(typErlaubt('bwa.pdf', 'application/pdf'), true, 'erlaubter Typ');
assert.equal(typErlaubt('bwa.pdf', 'text/plain'), false, 'Endung/Typ passen nicht zusammen');
assert.equal(typErlaubt('schadcode.exe', 'application/octet-stream'), false, '.exe ist verboten');
assert.equal(typErlaubt('skript.js', 'text/javascript'), false, '.js ist verboten');
assert.equal(typErlaubt('liste.csv', 'text/csv'), true);
assert.ok(Object.keys(ERLAUBT).length === 9, '9 erlaubte Endungen');
assert.equal(MAX_BYTES, 50 * 1024 * 1024);
assert.equal(MAX_DATEIEN, 30);

// dateinameSicher: Umlaute bleiben, Sonderzeichen werden zu `_`
assert.equal(dateinameSicher('Bwa Müller 2026.pdf'), 'Bwa Müller 2026.pdf', 'Umlaute und Leerzeichen bleiben');
assert.equal(dateinameSicher('../../etc/passwd'), '.._.._etc_passwd', 'Pfadtrenner werden zu `_`');
assert.equal(dateinameSicher('süß?!.csv'), 'süß__.csv', 'Sonderzeichen werden zu `_`');
assert.equal(dateinameSicher(''), 'datei', 'leerer Name bekommt einen Platzhalter');

// ordnerName: Regel aus den Global Constraints
assert.equal(ordnerName('Müller Bedachungen GmbH', 'abc12345-…'), 'Müller Bedachungen GmbH', 'Umlaute und Leerzeichen bleiben');
assert.equal(ordnerName('Schmidt & Co. KG!', 'abc12345-…'), 'Schmidt _ Co. KG_', 'Sonderzeichen werden zu `_`');
assert.equal(ordnerName('   ', 'abc12345-6789'), 'Kunde-abc12345', 'leerer Firmenname → Kunde-<id kurz>');
assert.equal(ordnerName('', 'abc12345-6789'), 'Kunde-abc12345', 'fehlender Firmenname → Kunde-<id kurz>');
assert.equal(ordnerName('X'.repeat(100), 'abc12345-6789').length, 80, 'Kappung bei 80 Zeichen');

console.log('ok');
