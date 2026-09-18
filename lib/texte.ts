import { db } from './db';
import seed from '@/data/texte-seed.json';

export async function texteLaden(): Promise<Record<string, string>> {
  const { data } = await db.from('wb_texte').select('key,wert');
  const aus: Record<string, string> = { ...(seed as Record<string, string>) };
  for (const t of data ?? []) aus[t.key] = t.wert;
  return aus;
}
export function fuelle(text: string, werte: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (_, k) => werte[k] ?? '');
}
