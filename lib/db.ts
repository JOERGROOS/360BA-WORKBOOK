import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export type FrageTyp = 'text' | 'skala' | 'tabelle';
export type KapitelTyp = 'fakten' | 'faktor';
export type TabellenOptionen = { zeilen: string[]; spalten: string[] };

export type Kapitel = { id: string; position: number; titel: string; untertitel: string; einleitung: string; typ: KapitelTyp; aktiv: boolean };
export type Frage = { id: string; chapter_id: string; position: number; text: string; hinweis: string; typ: FrageTyp; optionen: Partial<TabellenOptionen>; aktiv: boolean };

export type SnapshotFrage = { id: string; typ: FrageTyp; text: string; hinweis: string; optionen?: TabellenOptionen };
export type SnapshotKapitel = { id: string; titel: string; untertitel: string; typ: KapitelTyp; einleitung: string; fragen: SnapshotFrage[] };
export type Snapshot = { kapitel: SnapshotKapitel[]; erstellt: string };

export type TabellenWert = Record<string, Record<string, string>>; // zeile → spalte → Wert
export type Antwort = string | number | TabellenWert;
export type Antworten = Record<string, Antwort>;

export type Kontakt = { vorname: string; nachname: string; firma: string; telefon: string; email: string };

export type Sitzung = {
  id: string; token: string; vorname: string; nachname: string; firma: string; telefon: string; email: string;
  status: 'eingeladen' | 'laufend' | 'ergebnis' | 'abgeschlossen'; test: boolean;
  fragen_snapshot: Snapshot; antworten: Antworten; aha: string; aktuelle_frage: number;
  pdf_path: string | null; created_at: string; updated_at: string; gestartet_at: string | null; abgeschlossen_at: string | null;
  diktate: number; abholen_angefordert: string | null;
  termin_am: string | null;
  erinnerung_14_gesendet_at: string | null; erinnerung_10_gesendet_at: string | null; erinnerung_7_gesendet_at: string | null;
};

function pflicht(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Umgebungsvariable ${name} fehlt`);
  return v;
}

const supabaseUrl = pflicht('SUPABASE_URL');
// Start-Prüfung: eine falsch gesetzte SUPABASE_URL (z. B. leer/falsche Domain) liefert sonst
// stumme HTML-Fehlerseiten statt Daten zurück — das fällt erst im Vercel-Funktionslog auf, wenn
// hier direkt geworfen wird, nicht erst beim ersten DB-Zugriff mitten in einer Route.
if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(supabaseUrl)) {
  throw new Error(`Umgebungsvariable SUPABASE_URL ungültig (erwartet https://<projekt>.supabase.co)`);
}

// Nur serverseitig verwenden. Der Service-Role-Key darf nie in den Browser.
export const db = createClient(supabaseUrl, pflicht('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });

// Gemeinsames Muster für alle Admin-Routen: DB-Fehler nie roh an den Client (kann z. B. eine ganze
// HTML-Fehlerseite sein), stattdessen kurze deutsche Meldung + voller Fehler ins Server-Log.
export function dbFehler(bereich: string, error: { message: string }, meldung: string) {
  console.error(`[admin ${bereich}]`, error);
  return NextResponse.json({ error: meldung }, { status: 500 });
}
