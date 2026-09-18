import OpenAI from 'openai';

export async function transkribiere(datei: File): Promise<string> {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY fehlt');
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const r = await client.audio.transcriptions.create({ file: datei, model: 'gpt-4o-mini-transcribe', language: 'de', response_format: 'text' });
  return typeof r === 'string' ? r.trim() : String((r as { text?: string }).text ?? '').trim();
}
