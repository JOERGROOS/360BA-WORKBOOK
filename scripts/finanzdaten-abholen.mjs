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
// Ein Name gilt als vergeben, wenn er auf der Platte liegt ODER schon einer anderen Zeile
// als `lokaler_name` gehört (`beanspruchteNamen`, Pfade relativ zu ZIEL_BASIS) — sonst
// könnten zwei Zeilen im selben Lauf denselben freien Namen ziehen, solange die Datei
// (z. B. wegen eines fehlgeschlagenen Downloads) noch gar nicht auf der Platte liegt.
function freierPfad(ordner, dateiname, beanspruchteNamen) {
  const ext = path.extname(dateiname);
  const basis = dateiname.slice(0, dateiname.length - ext.length);
  let name = dateiname;
  const vergeben = () => fs.existsSync(path.join(ordner, name)) || beanspruchteNamen.has(path.relative(ZIEL_BASIS, path.join(ordner, name)));
  for (let i = 2; vergeben(); i++) {
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

// Alle schon vergebenen lokalen Namen laden — auch von Zeilen, die noch nicht abgeholt
// sind (Download kann noch laufen oder zuletzt fehlgeschlagen sein). Ohne diese Liste
// könnte eine zweite Zeile im selben Lauf denselben Namen ziehen, weil die erste Zeile
// ihre Datei noch gar nicht geschrieben hat.
const { data: vergebeneNamen, error: eVergeben } = await db.from('wb_dateien').select('lokaler_name').not('lokaler_name', 'is', null);
if (eVergeben) {
  log(`FEHLER beanspruchte Namen konnten nicht geladen werden: ${eVergeben.message}`);
  process.exit(1);
}
const beanspruchteNamen = new Set((vergebeneNamen ?? []).map((z) => z.lokaler_name));

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
      // Gespeichert relativ zu ZIEL_BASIS (`<Ordner>/<Datei>`), damit eine spätere
      // Änderung des Firmennamens (→ neuer Ordner) den alten Pfad nicht verwaist —
      // ein alter, bare Name ohne `/` (nur aus einem frühen Test, nicht im Bestand)
      // wird als relativ zum HEUTIGEN Ordner gelesen.
      zielPfad = zeile.lokaler_name.includes('/') ? path.join(ZIEL_BASIS, zeile.lokaler_name) : path.join(ordner, zeile.lokaler_name);
      if (fs.existsSync(zielPfad) && fs.statSync(zielPfad).size === zeile.bytes) {
        const { error: eUpdate } = await db.from('wb_dateien').update({ abgeholt_at: new Date().toISOString() }).eq('id', zeile.id);
        if (eUpdate) throw eUpdate;
        log(`bereits vorhanden, markiert ${zielPfad}`);
        continue;
      }
      // Fehlt die Datei oder weicht die Größe ab → (erneut) genau an diesen Namen
      // schreiben, unten überschreibt der Download-Zweig sie über `.teil` + rename.
    } else {
      // Erster Durchlauf für diese Zeile: freien Namen im Ordner vergeben (gegen Platte
      // UND `beanspruchteNamen`) und SOFORT relativ zu ZIEL_BASIS auf der Zeile
      // festschreiben — noch VOR dem Download. Erst danach ist die Zeile unverwechselbar
      // an "ihre" Datei gebunden, auch wenn der Lauf gleich danach abbricht.
      zielPfad = freierPfad(ordner, dateiname, beanspruchteNamen);
      const relName = path.relative(ZIEL_BASIS, zielPfad);
      const { error: eName } = await db.from('wb_dateien').update({ lokaler_name: relName }).eq('id', zeile.id);
      if (eName) throw eName;
      beanspruchteNamen.add(relName);
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
