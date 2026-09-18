// Aufruf: node --env-file=.env.local scripts/seed.mjs
// Legt Kapitel, Fragen und Texte an, die noch fehlen (Abgleich über Titel bzw. Fragetext). Wiederholbar.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const fragen = JSON.parse(readFileSync('data/fragen-seed.json', 'utf8'));
const texte = JSON.parse(readFileSync('data/texte-seed.json', 'utf8'));

const { data: vorhandeneKapitel } = await db.from('wb_chapters').select('id,titel');
let neuKap = 0, neuFragen = 0;
for (const [ki, k] of fragen.kapitel.entries()) {
  let kap = vorhandeneKapitel?.find((x) => x.titel === k.titel);
  if (!kap) {
    const { data, error } = await db.from('wb_chapters').insert({ position: ki + 1, titel: k.titel, untertitel: k.untertitel, einleitung: k.einleitung, typ: k.typ }).select('id,titel').single();
    if (error) throw error; kap = data; neuKap++;
  }
  const { data: vorhandeneFragen } = await db.from('wb_questions').select('text').eq('chapter_id', kap.id);
  const set = new Set((vorhandeneFragen ?? []).map((f) => f.text));
  for (const [fi, f] of k.fragen.entries()) {
    if (set.has(f.text)) continue;
    const { error } = await db.from('wb_questions').insert({ chapter_id: kap.id, position: fi + 1, text: f.text, hinweis: f.hinweis ?? '', typ: f.typ, optionen: f.optionen ?? {} });
    if (error) throw error; neuFragen++;
  }
}
const { data: vorhandeneTexte } = await db.from('wb_texte').select('key');
const keys = new Set((vorhandeneTexte ?? []).map((t) => t.key));
const neueTexte = Object.entries(texte).filter(([k]) => !keys.has(k)).map(([key, wert]) => ({ key, wert }));
if (neueTexte.length) { const { error } = await db.from('wb_texte').insert(neueTexte); if (error) throw error; }
console.log(`seed ok · Kapitel neu ${neuKap} · Fragen neu ${neuFragen} · Texte neu ${neueTexte.length}`);
