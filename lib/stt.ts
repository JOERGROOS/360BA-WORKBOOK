import OpenAI from 'openai';

const MODELL = 'gpt-4o-mini-transcribe';

export async function transkribiere(datei: File): Promise<string> {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY fehlt');
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  console.info('[stt] modell', { modell: MODELL, bytes: datei.size, typ: datei.type });
  const r = await client.audio.transcriptions.create({ file: datei, model: MODELL, language: 'de', response_format: 'text' });
  return typeof r === 'string' ? r.trim() : String((r as { text?: string }).text ?? '').trim();
}
