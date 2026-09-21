import type { Sitzung } from './db';
import { analysiere, docxErzeugen, managementSummaryDateiname } from './management-summary';
import { managementSummaryMailSenden } from './mail';

// Gesamter Ablauf nach einem echten Kunden-Abschluss: analysieren, Word bauen, verschicken.
// NIE bei einer Test-Sitzung (sonst bekäme controlling@ bei jedem "Vorschau als Kunde"-Klick
// eine Analyse) — die Prüfung sitzt hier, nicht beim Aufrufer, damit sie nicht vergessen wird.
export async function managementSummaryErstellenUndSenden(s: Sitzung): Promise<void> {
  if (s.test) return;
  const zusammenfassung = await analysiere(s);
  const docx = await docxErzeugen(zusammenfassung, { vorname: s.vorname, nachname: s.nachname, firma: s.firma, terminAm: s.termin_am });
  await managementSummaryMailSenden(s, docx, managementSummaryDateiname(s));
}
