import { db, type Sitzung } from './db';
import { typErlaubt, dateinameSicher, MAX_BYTES, MAX_DATEIEN } from './dateinamen';

const BUCKET = 'finanzdaten';

export type DateiEintrag = { dateiname: string; bytes: number; created_at: string };
export type DateiEintragAdmin = DateiEintrag & { pfad: string; abgeholt_at: string | null; url: string; hinweis?: string };

// Eingabefehler (falscher Typ, zu groß, Grenze erreicht, Pfad passt nicht) → 400/404 an den
// Client. Alles andere (Supabase-/DB-Fehler) ist ein Serverfehler → 500, siehe die Routen.
export class EingabeFehler extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function dateinameAusStorageName(name: string): string {
  return name.replace(/^\d+-/, '');
}

// Objekte, die im Speicher liegen, aber keine wb_dateien-Zeile haben (Kunde hat den Browser
// zwischen PUT und Registrieren geschlossen), automatisch nachtragen — mit den echten Werten
// aus dem Speicher, nicht erfunden. Läuft vor jeder Leseliste, damit nichts verloren geht.
// Best-effort: ein Speicher-Hänger hier darf NIE die eigentliche Liste (die DB-bekannten
// Zeilen) verhindern — sonst wird aus einer kurzen Störung ein 500 beim Kunden und ein
// dauerhaft blockierter „Fertig"-Knopf. Scheitert der Abgleich, wird er übersprungen und
// nur gewarnt; beim nächsten Aufruf greift er wieder.
async function verwaisteObjekteRegistrieren(sitzungId: string): Promise<void> {
  try {
    const { data: objekte, error: eListe } = await db.storage.from(BUCKET).list(sitzungId);
    if (eListe) throw eListe;
    if (!objekte || objekte.length === 0) return;
    const { data: zeilen, error: eZeilen } = await db.from('wb_dateien').select('pfad').eq('session_id', sitzungId);
    if (eZeilen) throw eZeilen;
    const bekannt = new Set((zeilen ?? []).map((z) => z.pfad as string));
    const neu = objekte
      .filter((o) => !bekannt.has(`${sitzungId}/${o.name}`))
      .map((o) => ({
        session_id: sitzungId,
        dateiname: dateinameAusStorageName(o.name),
        pfad: `${sitzungId}/${o.name}`,
        bytes: o.metadata?.size ?? 0,
        content_type: o.metadata?.mimetype ?? 'application/octet-stream',
      }));
    if (neu.length === 0) return;
    // upsert statt insert: zwei fast gleichzeitige Nachtrag-Läufe (z. B. Kunde + Admin öffnen
    // beide gerade die Liste) sollen sich nicht an der unique-Spalte `pfad` verschlucken.
    const { error: eInsert } = await db.from('wb_dateien').upsert(neu, { onConflict: 'pfad', ignoreDuplicates: true });
    if (eInsert) throw eInsert;
  } catch (e) {
    console.warn('[dateien] Abgleich übersprungen', e);
    return;
  }
}

// Signierte Adresse für einen Kunden-Upload direkt vom Browser in den privaten Bucket.
// Prüft Typ und Größe VOR dem Erzeugen der Adresse — ein verbotener Typ oder eine zu große
// Datei bekommt so schon hier eine klare 400-Antwort, ohne unnötig eine Adresse zu erzeugen.
// Die 30er-Grenze wird HIER geprüft (nicht erst beim Registrieren): sonst könnte jemand beliebig
// viele signierte Adressen holen und hochladen, ohne je zu registrieren.
export async function uploadAdresse(s: Sitzung, dateiname: string, contentType: string, bytes: number): Promise<{ pfad: string; signedUrl: string; token: string }> {
  if (!typErlaubt(dateiname, contentType)) throw new EingabeFehler('Dieser Dateityp ist nicht erlaubt.');
  if (!(bytes > 0) || bytes > MAX_BYTES) throw new EingabeFehler('Die Datei ist größer als 50 MB.');
  const [{ count, error: eCount }, { data: objekte, error: eListe }] = await Promise.all([
    db.from('wb_dateien').select('id', { count: 'exact', head: true }).eq('session_id', s.id),
    db.storage.from(BUCKET).list(s.id),
  ]);
  if (eCount) throw eCount;
  if (eListe) throw eListe;
  if ((count ?? 0) >= MAX_DATEIEN || (objekte?.length ?? 0) >= MAX_DATEIEN) throw new EingabeFehler('Höchstens 30 Dateien je Workbook.');
  const pfad = `${s.id}/${Date.now()}-${dateinameSicher(dateiname)}`;
  const { data, error } = await db.storage.from(BUCKET).createSignedUploadUrl(pfad);
  if (error || !data) throw error ?? new Error('Keine Adresse erhalten');
  return { pfad, signedUrl: data.signedUrl, token: data.token };
}

// Registriert eine bereits hochgeladene Datei: prüft, dass sie wirklich im Bucket liegt
// (storage.list) und übernimmt Größe/Typ von DORT — nicht vom Client, der hier lügen könnte.
// Nur der Dateiname (reine Anzeige, keine Pfad-/Typ-Wirkung mehr) kommt vom Client.
export async function dateiRegistrieren(s: Sitzung, meta: { pfad: string; dateiname: string }): Promise<void> {
  if (!meta.pfad.startsWith(`${s.id}/`)) throw new EingabeFehler('Pfad gehört nicht zu dieser Sitzung.');
  const trennstelle = meta.pfad.lastIndexOf('/');
  const ordner = meta.pfad.slice(0, trennstelle);
  const basisname = meta.pfad.slice(trennstelle + 1);
  const { data: dateien, error: eListe } = await db.storage.from(BUCKET).list(ordner);
  if (eListe) throw eListe;
  const objekt = dateien?.find((d) => d.name === basisname);
  if (!objekt) throw new EingabeFehler('Datei nicht gefunden.', 404);
  const { count, error: eCount } = await db.from('wb_dateien').select('id', { count: 'exact', head: true }).eq('session_id', s.id);
  if (eCount) throw eCount;
  if ((count ?? 0) >= MAX_DATEIEN) throw new EingabeFehler('Höchstens 30 Dateien je Workbook.');
  const { error } = await db.from('wb_dateien').insert({
    session_id: s.id,
    dateiname: meta.dateiname,
    pfad: meta.pfad,
    bytes: objekt.metadata?.size ?? 0,
    content_type: objekt.metadata?.mimetype ?? 'application/octet-stream',
  });
  if (error) throw error;
}

export async function dateienFuer(sitzungId: string): Promise<DateiEintrag[]> {
  await verwaisteObjekteRegistrieren(sitzungId);
  const { data, error } = await db.from('wb_dateien').select('dateiname,bytes,created_at').eq('session_id', sitzungId).order('created_at');
  if (error) throw error;
  return (data ?? []) as DateiEintrag[];
}

// Für den Admin-Bereich: dieselbe Liste, zusätzlich Speicherpfad, Abhol-Status und eine
// eine Stunde gültige Download-Adresse je Datei. Scheitert die Adresse für EINE Datei
// (z. B. kurzer Supabase-Ausfall), fällt nur diese eine Zeile aus — nicht die ganze Liste.
export async function dateienFuerAdmin(sitzungId: string): Promise<DateiEintragAdmin[]> {
  await verwaisteObjekteRegistrieren(sitzungId);
  const { data, error } = await db.from('wb_dateien').select('dateiname,bytes,created_at,pfad,abgeholt_at').eq('session_id', sitzungId).order('created_at');
  if (error) throw error;
  const aus: DateiEintragAdmin[] = [];
  for (const d of (data ?? []) as (DateiEintrag & { pfad: string; abgeholt_at: string | null })[]) {
    const { data: adr, error: eAdr } = await db.storage.from(BUCKET).createSignedUrl(d.pfad, 3600);
    if (eAdr || !adr) {
      console.error('[dateien admin] Adresse fehlgeschlagen', d.pfad, eAdr);
      aus.push({ ...d, url: '', hinweis: 'Adresse konnte nicht erzeugt werden' });
      continue;
    }
    aus.push({ ...d, url: adr.signedUrl });
  }
  return aus;
}
