// Abholprogramm: lädt neue Finanzdaten-Uploads der Kunden aus dem privaten Supabase-Speicher
// auf Jörgs Mac herunter und markiert sie als abgeholt. Läuft alle 10 Minuten per launchd
// (siehe scripts/abholer-installieren.sh) — manuell mit:
//   node --env-file=$HOME/.config/360ba-workbook/.env.local scripts/finanzdaten-abholen.mjs
import { createClient } from '@supabase/supabase-js';
import { ordnerName, dateinameSicher } from '../lib/dateinamen.ts';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const ZIEL_BASIS = process.env.ABHOL_ZIEL
  ?? '/Users/joergroos/_JRB-SERVER/03-FULLFILMENT/360 GRAD BUSINESSANALYSE/1-Uploads von Kunden';
const LOG_DATEI = path.join(os.homedir(), 'Library/Logs/360ba-abholer.log');

function log(zeile) {
  fs.appendFileSync(LOG_DATEI, `${new Date().toISOString()} ${zeile}\n`);
}

// Findet einen freien Dateinamen im Zielordner — bei Namenskonflikt Suffix `-2`, `-3`, ...
function freierPfad(ordner, dateiname) {
  const ext = path.extname(dateiname);
  const basis = dateiname.slice(0, dateiname.length - ext.length);
  let name = dateiname;
  for (let i = 2; fs.existsSync(path.join(ordner, name)); i++) {
    name = `${basis}-${i}${ext}`;
  }
  return path.join(ordner, name);
}

// Ohne beide Schlüssel kann nichts geladen werden — klare Fehlermeldung statt eines
// undurchsichtigen Absturzes tief im Supabase-Client.
const fehlendeEnv = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'].filter((k) => !process.env[k]);
if (fehlendeEnv.length > 0) {
  log(`FEHLER Umgebungsvariablen fehlen (${fehlendeEnv.join(', ')})`);
  process.exit(1);
}

// Reste aus abgebrochenen Durchläufen (Mac ist mitten im Schreiben ausgegangen) räumen,
// bevor neu abgeholt wird — nur die `.teil`-Endung, sonst nichts im Zielordner.
for (const datei of fs.existsSync(ZIEL_BASIS) ? fs.readdirSync(ZIEL_BASIS, { recursive: true }) : []) {
  if (!datei.endsWith('.teil')) continue;
  const voll = path.join(ZIEL_BASIS, datei);
  try {
    fs.unlinkSync(voll);
    log(`Rest geräumt ${voll}`);
  } catch (e) {
    log(`FEHLER Rest konnte nicht geräumt werden ${voll}: ${e.message ?? e}`);
  }
}

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data: zeilen, error } = await db
  .from('wb_dateien')
  .select('id,dateiname,pfad,bytes,session_id,lokaler_name,wb_sessions(firma)')
  .is('abgeholt_at', null);

if (error) {
  log(`FEHLER Liste konnte nicht geladen werden: ${error.message}`);
  process.exit(1);
}

for (const zeile of zeilen ?? []) {
  const dateiname = dateinameSicher(zeile.dateiname);
  try {
    const ordner = path.join(ZIEL_BASIS, ordnerName(zeile.wb_sessions?.firma ?? '', zeile.session_id));
    fs.mkdirSync(ordner, { recursive: true });

    let zielPfad;
    if (zeile.lokaler_name) {
      // Diese Zeile hat schon einmal einen lokalen Namen bekommen (ggf. mit `-2`-Suffix
      // bei Namenskonflikt) — IMMER an genau diesen Namen gebunden. Nie erneut über
      // `freierPfad` einen Namen suchen, sonst verwechseln sich zwei Zeilen mit gleichem
      // Namen UND gleicher Größe (der eigentliche Fehler, den `lokaler_name` behebt).
      zielPfad = path.join(ordner, zeile.lokaler_name);
      if (fs.existsSync(zielPfad) && fs.statSync(zielPfad).size === zeile.bytes) {
        const { error: eUpdate } = await db.from('wb_dateien').update({ abgeholt_at: new Date().toISOString() }).eq('id', zeile.id);
        if (eUpdate) throw eUpdate;
        log(`bereits vorhanden, markiert ${zielPfad}`);
        continue;
      }
      // Fehlt die Datei oder weicht die Größe ab → (erneut) genau an diesen Namen
      // schreiben, unten überschreibt der Download-Zweig sie über `.teil` + rename.
    } else {
      // Erster Durchlauf für diese Zeile: freien Namen im Ordner vergeben und SOFORT auf
      // der Zeile festschreiben — noch VOR dem Download. Erst danach ist die Zeile
      // unverwechselbar an "ihre" Datei gebunden, auch wenn der Lauf gleich danach abbricht.
      zielPfad = freierPfad(ordner, dateiname);
      const { error: eName } = await db.from('wb_dateien').update({ lokaler_name: path.basename(zielPfad) }).eq('id', zeile.id);
      if (eName) throw eName;
    }

    const { data: blob, error: eDownload } = await db.storage.from('finanzdaten').download(zeile.pfad);
    if (eDownload) throw eDownload;
    const teilPfad = `${zielPfad}.teil`;
    fs.writeFileSync(teilPfad, Buffer.from(await blob.arrayBuffer()));
    fs.renameSync(teilPfad, zielPfad);
    const { error: eUpdate } = await db.from('wb_dateien').update({ abgeholt_at: new Date().toISOString() }).eq('id', zeile.id);
    if (eUpdate) throw eUpdate;
    log(`ok ${zielPfad}`);
  } catch (e) {
    log(`FEHLER ${dateiname}: ${e.message ?? e}`);
  }
}
