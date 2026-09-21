// Prüft die Schutzregeln der Glättung OHNE Netz: Was darf niemals als Antwort des
// Kunden durchgehen? Anlass (Jörg, 22.09.2026): Auf „Was sind deine Hobbys?" hatte das
// Modell statt zu glätten geantwortet — „Ich kann diese Anweisung nicht ausführen, da
// kein Text zur Bearbeitung vorhanden ist" — und dieser Satz stand dann im Workbook.
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

const quelle = readFileSync(new URL('../lib/glaettung.ts', import.meta.url), 'utf8');
const { wirktWieKommentar } = await import('../lib/glaettung.ts');

// 1. Die echte Fehlantwort aus Jörgs Workbook muss erkannt werden.
const echterFall = 'Ich kann diese Anweisung nicht ausführen, da kein Text zur Bearbeitung vorhanden ist. Du hast nur drei Stichpunkte eingegeben, aber keine Rohabschrift einer gesprochenen Antwort.\n\nBitte stelle mir einen zusammenhängenden Text zur Verfügung, den ich in verständliches Schriftdeutsch umwandeln soll.';
assert.equal(wirktWieKommentar('Fußball, Grillen und Reisen', echterFall), true, 'Die echte Fehlantwort wurde nicht erkannt');

// 2. Weitere Formen, in denen das Modell den Sprecher anspricht statt zu glätten.
for (const fall of [
  'Bitte stell mir den Text zur Verfügung, damit ich ihn glätten kann.',
  'Als KI kann ich dazu nichts sagen.',
  'Es ist keine gesprochenen Antwort vorhanden, die ich bearbeiten könnte.',
]) {
  assert.equal(wirktWieKommentar('Haltern am See, seit zwölf Jahren', fall), true, `Nicht erkannt: ${fall}`);
}

// 3. Echte Glättungen müssen durchgehen — sonst greift die Sicherung zu oft.
const rohLang = 'also ähm ich wohne in Haltern am See ja also da wohne ich jetzt schon seit zwölf Jahren mit meiner Familie';
assert.equal(wirktWieKommentar(rohLang, 'Ich wohne in Haltern am See, seit 12 Jahren mit meiner Familie.'), false, 'Eine gültige Glättung wurde fälschlich verworfen');
assert.equal(wirktWieKommentar('Fußball, Grillen und Reisen', 'Fußball, Grillen und Reisen'), false, 'Unveränderte Stichpunkte wurden fälschlich verworfen');

// 4. Erfundener Zusatztext: deutlich länger als die Vorlage heißt, das Modell hat gedichtet.
assert.equal(
  wirktWieKommentar('Fußball und Grillen', 'Meine Hobbys sind Fußball und Grillen. Beim Fußball spiele ich seit meiner Jugend im Verein und schätze besonders den Zusammenhalt in der Mannschaft. Das Grillen ist für mich Entspannung pur.'),
  true, 'Dazugedichteter Text wurde nicht erkannt');

// 5. Die Schwelle, unterhalb derer gar nicht erst geglättet wird, muss im Code stehen.
assert.match(quelle, /OHNE_GLAETTUNG_BIS = 40/, 'Schwelle für kurze Antworten fehlt');
// 6. Die Frage muss als Zusammenhang mitgegeben werden, sonst bewertet das Modell blind.
assert.match(quelle, /glaette\(roh: string, frage\?: string\)/, 'Glättung nimmt die Frage nicht entgegen');
assert.match(quelle, /role: 'assistant', content: '<geglaettet>'/, 'Vorbelegung der Antwort fehlt');

console.log('ok');
