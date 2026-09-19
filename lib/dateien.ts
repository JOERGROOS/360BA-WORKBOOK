import { db, type Sitzung } from './db';
import { typErlaubt, dateinameSicher, MAX_BYTES, MAX_DATEIEN } from './dateinamen';

const BUCKET = 'finanzdaten';

export type DateiEintrag = { dateiname: string; bytes: number; created_at: string };
export type DateiEintragAdmin = DateiEintrag & { pfad: string; abgeholt_at: string | null; url: string };

// Signierte Adresse für einen Kunden-Upload direkt vom Browser in den privaten Bucket.
// Prüft Typ und Größe VOR dem Erzeugen der Adresse — ein verbotener Typ oder eine zu große
// Datei bekommt so schon hier eine klare 400-Antwort, ohne unnötig eine Adresse zu erzeugen.
export async function uploadAdresse(s: Sitzung, dateiname: string, contentType: string, bytes: number): Promise<{ pfad: string; signedUrl: string; token: string }> {
  if (!typErlaubt(dateiname, contentType)) throw new Error('Dieser Dateityp ist nicht erlaubt.');
  if (!(bytes > 0) || bytes > MAX_BYTES) throw new Error('Die Datei ist größer als 50 MB.');
  const pfad = `${s.id}/${Date.now()}-${dateinameSicher(dateiname)}`;
  const { data, error } = await db.storage.from(BUCKET).createSignedUploadUrl(pfad);
  if (error || !data) throw error ?? new Error('Keine Adresse erhalten');
  return { pfad, signedUrl: data.signedUrl, token: data.token };
}

// Registriert eine bereits hochgeladene Datei: prüft, dass sie wirklich im Bucket liegt
// (storage.list) und dass die Sitzung die Grenze von 30 Dateien nicht überschreitet.
export async function dateiRegistrieren(s: Sitzung, meta: { pfad: string; dateiname: string; bytes: number; content_type: string }): Promise<void> {
  if (!meta.pfad.startsWith(`${s.id}/`)) throw new Error('Pfad gehört nicht zu dieser Sitzung.');
  const trennstelle = meta.pfad.lastIndexOf('/');
  const ordner = meta.pfad.slice(0, trennstelle);
  const basisname = meta.pfad.slice(trennstelle + 1);
  const { data: dateien, error: eListe } = await db.storage.from(BUCKET).list(ordner);
  if (eListe) throw eListe;
  if (!dateien?.some((d) => d.name === basisname)) throw new Error('Die Datei wurde im Speicher nicht gefunden.');
  const { count, error: eCount } = await db.from('wb_dateien').select('id', { count: 'exact', head: true }).eq('session_id', s.id);
  if (eCount) throw eCount;
  if ((count ?? 0) >= MAX_DATEIEN) throw new Error('Maximal 30 Dateien je Sitzung.');
  const { error } = await db.from('wb_dateien').insert({ session_id: s.id, dateiname: meta.dateiname, pfad: meta.pfad, bytes: meta.bytes, content_type: meta.content_type });
  if (error) throw error;
}

export async function dateienFuer(sitzungId: string): Promise<DateiEintrag[]> {
  const { data, error } = await db.from('wb_dateien').select('dateiname,bytes,created_at').eq('session_id', sitzungId).order('created_at');
  if (error) throw error;
  return (data ?? []) as DateiEintrag[];
}

// Für den Admin-Bereich: dieselbe Liste, zusätzlich Speicherpfad, Abhol-Status und eine
// eine Stunde gültige Download-Adresse je Datei.
export async function dateienFuerAdmin(sitzungId: string): Promise<DateiEintragAdmin[]> {
  const { data, error } = await db.from('wb_dateien').select('dateiname,bytes,created_at,pfad,abgeholt_at').eq('session_id', sitzungId).order('created_at');
  if (error) throw error;
  const aus: DateiEintragAdmin[] = [];
  for (const d of (data ?? []) as (DateiEintrag & { pfad: string; abgeholt_at: string | null })[]) {
    const { data: adr, error: eAdr } = await db.storage.from(BUCKET).createSignedUrl(d.pfad, 3600);
    if (eAdr || !adr) throw eAdr ?? new Error('Keine Adresse erhalten');
    aus.push({ ...d, url: adr.signedUrl });
  }
  return aus;
}
