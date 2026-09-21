import OpenAI from 'openai';

// Gemessen am 22.09.2026 mit fünf deutschen Testsätzen (Orte, Gewerke, Zahlen, Fachbegriffe,
// Markennamen), einmal sauber und einmal mit kräftigem Störgeräusch — so klingt ein
// Handwerker in der Werkstatt oder im Auto. Trefferquote bei gestörtem Ton:
//   gpt-4o-mini-transcribe ohne Wortschatz  74,6 %   ← der Stand bis zu diesem Tag
//   gpt-4o-mini-transcribe mit Wortschatz   94,3 %
//   gpt-4o-transcribe      mit Wortschatz   96,3 %
//   gpt-transcribe         mit Wortschatz   97,6 %   ← jetzt in Betrieb
//   gpt-transcribe         ohne Wortschatz  86,1 %
// Lehre daraus: Das Modell allein bringt wenig, der Wortschatz bringt den Sprung. Beides
// zusammen ist die Wahl. Ohne Wortschatz wurde aus „Steuerberater" ein „Feuerberater" und
// aus „fünf Gesellen, einen Azubi und einen Minijobber" wurden „fünf Busse, einen Bus und
// einen Minibusser".
const MODELL = 'gpt-transcribe';

// Der Wortschatz lenkt die Erkennung auf Jörgs Welt. Bewusst kurz gehalten und auf
// Begriffe beschränkt, die im Workbook wirklich vorkommen — eine überlange Liste
// verleitet das Modell dazu, Wörter zu hören, die gar nicht gesagt wurden.
export const WORTSCHATZ = [
  'Gespräch mit einem deutschen Handwerksunternehmer über seinen Betrieb und seine Zahlen.',
  'Mögliche Begriffe: Haltern am See, Recklinghausen, Ruhrgebiet, Geselle, Azubi, Minijobber,',
  'Meisterbetrieb, Sanitär, Heizung, Klima, Elektro, Dachdecker, Maler, Tischler, Wärmepumpe,',
  'Photovoltaik, Bad, Gewerk, BWA, Summen- und Saldenliste, SuSa, Rohertrag, Deckungsbeitrag,',
  'Liquidität, Auftragseingang, Stundenverrechnungssatz, Nachkalkulation, Angebot, Aufmaß,',
  'Jörg Roos, Finanzen Einfach Machen, FEM Elite, 360 Grad Business-Analyse.',
].join(' ');

export async function transkribiere(datei: File): Promise<string> {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY fehlt');
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  console.info('[stt] modell', { modell: MODELL, bytes: datei.size, typ: datei.type });
  const r = await client.audio.transcriptions.create({
    file: datei, model: MODELL, language: 'de', response_format: 'text', prompt: WORTSCHATZ,
  });
  return typeof r === 'string' ? r.trim() : String((r as { text?: string }).text ?? '').trim();
}
