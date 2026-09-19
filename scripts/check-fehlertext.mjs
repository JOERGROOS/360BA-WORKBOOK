import assert from 'node:assert/strict';
const { AufrufFehler, fehlertext } = await import('../lib/fehlertext.ts');

// HTML-Antwort (z. B. falsch konfigurierte SUPABASE_URL liefert eine ganze Fehlerseite) →
// generischer Text, kein Markup im Admin-Bereich.
const htmlSeite = '<!DOCTYPE html><html><body>Internal Server Error</body></html>';
assert.equal(fehlertext(new AufrufFehler(htmlSeite, 500)), 'Der Server hat mit einem Fehler geantwortet.');

// HTML mitten im Text, aber unter 500 Zeichen → Tags raus, nicht generisch.
assert.equal(fehlertext(new AufrufFehler('Fehler: <b>Ups</b>  nochmal   versuchen', 500)), 'Fehler: Ups nochmal versuchen');

// Lang, aber kein Markup → auf 200 Zeichen gekappt mit „…“.
const lang = 'x'.repeat(300);
assert.equal(fehlertext(new AufrufFehler(lang, 500)), `${'x'.repeat(200)}…`);

// 401 bleibt die feste Meldung, unabhängig vom Text.
assert.equal(fehlertext(new AufrufFehler('irrelevant', 401)), 'Sitzung abgelaufen – bitte neu anmelden.');

// Kurzer, normaler Fehler bleibt unverändert.
assert.equal(fehlertext(new AufrufFehler('Kapitel hat noch Fragen', 409)), 'Kapitel hat noch Fragen');

console.log('ok');
