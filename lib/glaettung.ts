import Anthropic from '@anthropic-ai/sdk';

// Kurze Antworten gehen unverändert durch. Grund (Jörg, 22.09.2026): Auf „Was sind deine
// Hobbys?" hatte der Kunde „Fußball, Grillen und Reisen" gesagt — eine vollständige,
// richtige Antwort. Das Modell hielt das für einen unvollständigen Auftrag und schrieb
// zurück „Ich kann diese Anweisung nicht ausführen, da kein Text zur Bearbeitung vorhanden
// ist" — und genau dieser Satz landete als Antwort des Kunden im Workbook. An so einem
// Text ist ohnehin nichts zu glätten; der Aufruf spart nur Zeit und Risiko.
const OHNE_GLAETTUNG_BIS = 40;

// Ziffern-Satz unten: "exakt übernehmen" allein ließ Haiku Zahlwörter wie "zwölf" stehen, statt sie in Schriftform ("12") zu bringen.
export const GLAETTUNG_ANWEISUNG = `Du bekommst die Rohabschrift einer gesprochenen Antwort eines Handwerksunternehmers auf eine Frage in einem Workbook.
Bring den Text in verständliches Schriftdeutsch, so wie der Sprecher es selbst aufschreiben würde.

Das Wichtigste zuerst: Du bist ein Schreibwerkzeug, kein Gesprächspartner. Du antwortest NIE auf die Frage, du kommentierst NIE, du bewertest NIE und du wendest dich NIE an den Sprecher. Auch dann nicht, wenn die Antwort kurz, unvollständig, stichpunktartig oder unpassend wirkt — in dem Fall gibst du sie einfach unverändert zurück. Stichpunkte bleiben Stichpunkte.

Regeln:
- Ich-Perspektive und Wortwahl des Sprechers behalten. Kein Berater-Ton.
- Füllwörter, Versprecher, Wiederholungen und Satzabbrüche entfernen. Sätze vollständig und gerade machen.
- Nichts hinzufügen, nichts bewerten, nichts zusammenfassen, nichts ergänzen. Jede inhaltliche Aussage bleibt erhalten.
- Zahlen, Namen, Firmen, Orte und Fachbegriffe exakt übernehmen. Gesprochene Zahlwörter (z. B. "zwölf") als Ziffern schreiben (z. B. "12"), der Wert bleibt exakt erhalten.
- Absätze nur, wenn der Sprecher erkennbar das Thema wechselt.
- Ist der Text schon sauber, gib ihn unverändert zurück.
- Die Frage dient NUR dem Verständnis, damit du Namen und Orte richtig einordnest. Sie wird nicht beantwortet und nicht wiederholt.

Antworte ausschließlich mit dem geglätteten Text zwischen <geglaettet> und </geglaettet>. Keine Einleitung, keine Anführungszeichen, keine Erklärung.`;

const META_SPUREN = [
  'ich kann diese anweisung',
  'kein text zur bearbeitung',
  'bitte stelle mir',
  'bitte stell mir',
  'zur verfügung, den ich',
  'keine rohabschrift',
  'du hast nur',
  'als ki',
  'ich bin ein',
  'gesprochenen antwort vorhanden',
];

// Letzte Sicherung, falls das Modell trotz Anweisung antwortet statt zu glätten.
// Zwei Anzeichen: verräterische Wendungen — oder ein Ergebnis, das deutlich mehr Text
// enthält als die Vorlage (dann hat es etwas dazuerfunden statt aufgeräumt).
export function wirktWieKommentar(roh: string, aus: string): boolean {
  const klein = aus.toLowerCase();
  if (META_SPUREN.some((s) => klein.includes(s))) return true;
  return aus.length > roh.length * 2.5 + 40;
}

export async function glaette(roh: string, frage?: string): Promise<string> {
  const text = roh.trim();
  if (text.length < OHNE_GLAETTUNG_BIS) return text;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const kontext = frage?.trim() ? `Die gestellte Frage lautete: ${frage.trim()}\n\n` : '';
  const r = await client.messages.create({
    model: 'claude-haiku-4-5-20251001', max_tokens: 2000, temperature: 0, system: GLAETTUNG_ANWEISUNG,
    messages: [
      { role: 'user', content: `${kontext}<rohabschrift>\n${text}\n</rohabschrift>` },
      // Vorbelegung der Antwort: Damit kann das Modell gar nicht erst mit einem Vorwort
      // oder einer Rückfrage anfangen — es schreibt zwangsläufig im Text weiter.
      { role: 'assistant', content: '<geglaettet>' },
    ],
  });
  const roh_aus = r.content.filter((c) => c.type === 'text').map((c) => (c as { text: string }).text).join('');
  const geglaettet = roh_aus.split('</geglaettet>')[0].replace(/^<geglaettet>/, '').trim();
  if (!geglaettet || wirktWieKommentar(text, geglaettet)) {
    console.warn('[glaettung] verworfen', { rohZeichen: text.length, ausZeichen: geglaettet.length, anfang: geglaettet.slice(0, 80) });
    return text;
  }
  return geglaettet;
}
