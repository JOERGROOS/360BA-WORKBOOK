// Abholprogramm: lädt neue Finanzdaten-Uploads der Kunden aus dem privaten Supabase-Speicher
// auf Jörgs Mac herunter und markiert sie als abgeholt. Zwei launchd-Jobs (siehe
// scripts/abholer-installieren.sh): Vollmodus täglich 08:00/14:00 (alle unabgeholten Dateien),
// `--nur-angefordert` alle 5 Minuten (nur Sitzungen, für die der Admin "Auf meinen Mac
// abholen" geklickt hat) — manuell mit:
//   node --env-file=$HOME/.config/360ba-workbook/.env.local scripts/finanzdaten-abholen.mjs [--nur-angefordert]
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

const nurAngefordert = process.argv.includes('--nur-angefordert');
const modus = nurAngefordert ? 'angefordert' : 'voll';

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// Schneller Ausstieg für den 5-Minuten-Job: genau EINE Abfrage, ob überhaupt eine Sitzung
// "Auf meinen Mac abholen" angefordert hat. Im Normalfall (nichts angefordert) endet der
// Lauf hier — ohne die teureren Abfragen unten (beanspruchte Namen, Dateien) zu stellen.
let angeforderteSessionIds = null;
if (nurAngefordert) {
  const { data: sessions, error: eSessions } = await db.from('wb_sessions').select('id').not('abholen_angefordert', 'is', null);
  if (eSessions) {
    log(`FEHLER angeforderte Sitzungen konnten nicht geladen werden: ${eSessions.message}`);
    process.exit(1);
  }
  angeforderteSessionIds = (sessions ?? []).map((s) => s.id);
  if (angeforderteSessionIds.length === 0) {
    // Nichts angefordert — der Normalfall bei diesem alle-5-Minuten-Job. Keine Log-Zeile,
    // sonst wächst das Protokoll ungebremst mit Zeilen, die nichts sagen.
    process.exit(0);
  }
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

let zeilenAbfrage = db
  .from('wb_dateien')
  .select('id,dateiname,pfad,bytes,session_id,lokaler_name,wb_sessions(firma)')
  .is('abgeholt_at', null);
if (angeforderteSessionIds) zeilenAbfrage = zeilenAbfrage.in('session_id', angeforderteSessionIds);
const { data: zeilen, error } = await zeilenAbfrage;

if (error) {
  log(`FEHLER Liste konnte nicht geladen werden: ${error.message}`);
  process.exit(1);
}

let fehlerAufgetreten = false;

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
    fehlerAufgetreten = true;
    log(`FEHLER ${dateiname}: ${e.message ?? e}`);
  }
}

// Zusammenfassungs-Zeile: im Vollmodus immer (fester Rhythmus 08:00/14:00, ein Eintrag ist
// erwartet). Im 5-Minuten-Job NUR, wenn wirklich etwas passiert ist — sonst besteht das
// Protokoll bald nur noch aus "0 Dateien"-Zeilen aus dem Leerlauf.
const anzahlDateien = (zeilen ?? []).length;
if (!nurAngefordert || anzahlDateien > 0 || fehlerAufgetreten) {
  log(`Modus: ${modus} · ${anzahlDateien} Dateien`);
}

// Signal für "Auf meinen Mac abholen" löschen. Im angeforderten Modus für JEDE angefragte
// Sitzung (auch wenn sie schon nichts Unabgeholtes mehr hatte — sonst bliebe das Signal
// stehen); im Vollmodus für die Sitzungen, deren Dateien gerade bearbeitet wurden.
const zuLoeschen = angeforderteSessionIds ?? [...new Set((zeilen ?? []).map((z) => z.session_id))];
if (zuLoeschen.length > 0) {
  const { error: eSignal } = await db.from('wb_sessions').update({ abholen_angefordert: null }).in('id', zuLoeschen);
  if (eSignal) log(`FEHLER Signal konnte nicht gelöscht werden: ${eSignal.message}`);
}
