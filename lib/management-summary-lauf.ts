import { db, type Sitzung } from './db';
import { analysiere, docxErzeugen, managementSummaryDateiname } from './management-summary';
import { managementSummaryMailSenden } from './mail';

const BUCKET = 'management-summaries';

// Gesamter Ablauf nach einem echten Kunden-Abschluss: analysieren, Word bauen, im eigenen
// privaten Speicherbereich ablegen (damit das Team sie auch im Admin herunterladen kann, nicht
// nur per Mail), dann verschicken. Ablegen VOR dem Mail-Versand und unabhängig von dessen
// Erfolg — genau wie beim Kunden-PDF in lib/abschluss.ts darf ein Mail-Fehler die schon
// erzeugte Datei nicht verschwinden lassen.
// NIE bei einer Test-Sitzung (sonst bekäme controlling@ bei jedem "Vorschau als Kunde"-Klick
// eine Analyse) — die Prüfung sitzt hier, nicht beim Aufrufer, damit sie nicht vergessen wird.
export async function managementSummaryErstellenUndSenden(s: Sitzung): Promise<void> {
  if (s.test) return;
  const zusammenfassung = await analysiere(s);
  const docx = await docxErzeugen(zusammenfassung, { vorname: s.vorname, nachname: s.nachname, firma: s.firma, terminAm: s.termin_am });
  const dateiname = managementSummaryDateiname(s);
  const pfad = `${s.id}/${dateiname}`;
  const { error: eUp } = await db.storage.from(BUCKET).upload(pfad, docx, {
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    upsert: true,
  });
  if (eUp) throw eUp;
  const { error: eDb } = await db.from('wb_sessions').update({ management_summary_path: pfad }).eq('id', s.id);
  if (eDb) throw eDb;
  await managementSummaryMailSenden(s, docx, dateiname);
}
