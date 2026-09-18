import Anthropic from '@anthropic-ai/sdk';

// Ziffern-Satz unten: "exakt übernehmen" allein ließ Haiku Zahlwörter wie "zwölf" stehen, statt sie in Schriftform ("12") zu bringen.
export const GLAETTUNG_ANWEISUNG = `Du bekommst die Rohabschrift einer gesprochenen Antwort eines Handwerksunternehmers auf eine Frage in einem Workbook.
Bring den Text in verständliches Schriftdeutsch, so wie der Sprecher es selbst aufschreiben würde.
Regeln:
- Ich-Perspektive und Wortwahl des Sprechers behalten. Kein Berater-Ton.
- Füllwörter, Versprecher, Wiederholungen und Satzabbrüche entfernen. Sätze vollständig und gerade machen.
- Nichts hinzufügen, nichts bewerten, nichts zusammenfassen. Jede inhaltliche Aussage bleibt erhalten.
- Zahlen, Namen, Firmen, Orte und Fachbegriffe exakt übernehmen. Gesprochene Zahlwörter (z. B. "zwölf") als Ziffern schreiben (z. B. "12"), der Wert bleibt exakt erhalten.
- Absätze nur, wenn der Sprecher erkennbar das Thema wechselt.
- Antworte ausschließlich mit dem geglätteten Text. Keine Einleitung, keine Anführungszeichen, keine Erklärung.`;

export async function glaette(roh: string): Promise<string> {
  if (roh.trim().length < 12) return roh.trim();
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const r = await client.messages.create({
    model: 'claude-haiku-4-5-20251001', max_tokens: 2000, temperature: 0, system: GLAETTUNG_ANWEISUNG,
    messages: [{ role: 'user', content: roh }],
  });
  const text = r.content.filter((c) => c.type === 'text').map((c) => (c as { text: string }).text).join('').trim();
  return text || roh.trim();
}
