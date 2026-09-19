import { createClient } from '@supabase/supabase-js';

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

export type Sitzung = {
  id: string; token: string; vorname: string; nachname: string; firma: string; telefon: string; email: string;
  status: 'eingeladen' | 'laufend' | 'ergebnis' | 'abgeschlossen'; test: boolean;
  fragen_snapshot: Snapshot; antworten: Antworten; aha: string; aktuelle_frage: number;
  pdf_path: string | null; created_at: string; updated_at: string; abgeschlossen_at: string | null;
};

function pflicht(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Umgebungsvariable ${name} fehlt`);
  return v;
}

// Nur serverseitig verwenden. Der Service-Role-Key darf nie in den Browser.
export const db = createClient(pflicht('SUPABASE_URL'), pflicht('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
