import { randomBytes } from 'node:crypto';
import { db, type Snapshot, type SnapshotKapitel, type Sitzung, type Antwort, type Kapitel, type Frage, type TabellenOptionen, type Kontakt } from './db';

export type { Kontakt };

function platzhalterJahr(s: string): string {
  const jahr = new Date().getFullYear();
  return s.replace(/\{jahr(-(\d))?\}/g, (_, __, d) => String(jahr - (d ? Number(d) : 0)));
}

export async function snapshotZiehen(): Promise<Snapshot> {
  const { data: kapitel, error: e1 } = await db.from('wb_chapters').select('*').eq('aktiv', true).order('position');
  if (e1) throw e1;
  const { data: fragen, error: e2 } = await db.from('wb_questions').select('*').eq('aktiv', true).order('position');
  if (e2) throw e2;
  const kap: SnapshotKapitel[] = (kapitel as Kapitel[]).map((k) => ({
    id: k.id, titel: k.titel, untertitel: k.untertitel, typ: k.typ, einleitung: k.einleitung,
    fragen: (fragen as Frage[]).filter((f) => f.chapter_id === k.id).map((f) => ({
      id: f.id, typ: f.typ, text: f.text, hinweis: f.hinweis,
      ...(f.typ === 'tabelle' ? { optionen: { zeilen: (f.optionen.zeilen ?? []).map(platzhalterJahr), spalten: (f.optionen.spalten ?? []).map(platzhalterJahr) } as TabellenOptionen } : {}),
    })),
  })).filter((k) => k.fragen.length > 0);
  return { kapitel: kap, erstellt: new Date().toISOString() };
}

// Basis-Adresse: APP_URL (eigene Domain) → von Vercel gesetzte Produktions-Adresse → lokal.
// Ohne diese Kette landen Einladungslinks in Produktion auf localhost, wenn APP_URL fehlt.
export function basisAdresse(): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return 'http://localhost:3000';
}
export function linkFuer(s: { token: string }): string {
  return `${basisAdresse()}/w/${s.token}`;
}

// Einladung anlegen (Admin): Sitzung startet im Status 'eingeladen', Snapshot wird trotzdem gezogen
// (Spalte ist NOT NULL) und beim tatsächlichen Start noch einmal frisch gezogen.
export async function einladungAnlegen(k: Kontakt, test = false): Promise<Sitzung> {
  const snapshot = await snapshotZiehen();
  if (!snapshot.kapitel.length) throw new Error('Kein aktiver Fragebogen');
  const token = randomBytes(32).toString('base64url');
  const { data, error } = await db.from('wb_sessions').insert({ ...k, token, test, status: 'eingeladen', fragen_snapshot: snapshot }).select('*').single();
  if (error) throw error;
  return data as Sitzung;
}

export async function sitzungLaden(token: string): Promise<Sitzung | null> {
  if (!/^[A-Za-z0-9_-]{40,50}$/.test(token)) return null;
  const { data } = await db.from('wb_sessions').select('*').eq('token', token).maybeSingle();
  return (data as Sitzung) ?? null;
}

// Kunde bestätigt/korrigiert seine Daten auf der Einladungsseite und startet damit das Interview.
// Der Status-Filter im Update macht den Start atomar: Bei zwei fast gleichzeitigen Aufrufen
// gewinnt genau einer, der zweite bekommt keine Zeile zurück und wirft.
export async function sitzungStarten(token: string, k: Kontakt): Promise<Sitzung> {
  const s = await sitzungLaden(token);
  if (!s) throw new Error('Sitzung nicht gefunden');
  if (s.status !== 'eingeladen') throw new Error('Sitzung ist bereits gestartet');
  const snapshot = await snapshotZiehen();
  if (!snapshot.kapitel.length) throw new Error('Kein aktiver Fragebogen');
  const { data, error } = await db.from('wb_sessions').update({ ...k, status: 'laufend', aktuelle_frage: 0, fragen_snapshot: snapshot, gestartet_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', s.id).eq('status', 'eingeladen').select('*').maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Sitzung ist bereits gestartet');
  return data as Sitzung;
}

export async function antwortSpeichern(token: string, frageId: string, wert: Antwort, position: number): Promise<void> {
  const s = await sitzungLaden(token);
  if (!s) throw new Error('Sitzung nicht gefunden');
  if (s.status === 'eingeladen') throw new Error('Sitzung noch nicht gestartet');
  if (s.status === 'abgeschlossen') throw new Error('Sitzung ist abgeschlossen');
  if (frageId === '__aha') {
    if (typeof wert !== 'string') throw new Error('Ungültiger Wert');
    const { error } = await db.from('wb_sessions').update({ aha: wert.slice(0, 20000), status: s.status === 'laufend' ? 'ergebnis' : s.status, updated_at: new Date().toISOString() }).eq('id', s.id);
    if (error) throw error; return;
  }
  const kennt = s.fragen_snapshot.kapitel.some((k) => k.fragen.some((f) => f.id === frageId));
  if (!kennt) throw new Error('Frage gehört nicht zu dieser Sitzung');
  const antworten = { ...s.antworten, [frageId]: wert };
  const { error } = await db.from('wb_sessions').update({ antworten, aktuelle_frage: position, updated_at: new Date().toISOString() }).eq('id', s.id);
  if (error) throw error;
}
