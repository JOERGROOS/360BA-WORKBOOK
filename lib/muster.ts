// Musterdateien, die im Unterlagen-Fenster zum Herunterladen stehen. Sie liegen unter
// `public/muster/` und kommen damit von 360ba.joerg-roos.com selbst.
//
// Warum nicht der OneDrive-Link (Jörg-Entscheidung 22.09.2026): Sobald jemand bei Microsoft
// angemeldet ist, wirft SharePoint das Freigabe-Merkmal aus der Adresse und zeigt den Ordner
// mit den Rechten des angemeldeten Kontos. Bei Jörg war das ein Gastkonto ohne Rechte — er
// sah eine leere weiße Seite, ohne jede Fehlermeldung. Angemeldete Kunden könnten dasselbe
// erleben. Aus der App ausgeliefert, kann das nicht passieren.
//
// ⚠ Die drei BWA-Muster sind geglättete Fassungen: Die Originale trugen im Dateiinneren noch
// den echten Mandantennamen und die DATEV-Nummern, obwohl sichtbar „Musterholz GbR" steht.
// Sie wurden seitenweise zu Bildern gerendert und neu zusammengesetzt — Textebene und damit
// der versteckte Name sind weg (geprüft: null Textbefehle). Wer eine Datei austauscht, muss
// das erneut tun. Die Originale liegen in Jörgs OneDrive unter `10-geteilte Daten/
// 3-360BA-Kickoff-Unterlagen/1-Finanzdaten-Muster`.
export type Musterdatei = { datei: string; titel: string; art: 'PDF' | 'CSV'; gruppe: string };

export const MUSTER: Musterdatei[] = [
  { gruppe: 'Summen- und Saldenliste', art: 'CSV', titel: 'DATEV · Jahresübersicht', datei: 'datev-susa-jahresuebersicht-muster.csv' },
  { gruppe: 'Summen- und Saldenliste', art: 'CSV', titel: 'ADDISON · Jahresübersicht', datei: 'addison-susa-jahresuebersicht-muster.csv' },
  { gruppe: 'Summen- und Saldenliste', art: 'CSV', titel: 'AGENDA · Jahresübersicht', datei: 'agenda-susa-jahresuebersicht-muster.csv' },
  { gruppe: 'BWA', art: 'PDF', titel: 'Jahresübersicht', datei: 'bwa-jahresuebersicht-muster.pdf' },
  { gruppe: 'BWA', art: 'PDF', titel: 'Kurzfristige Erfolgsrechnung', datei: 'bwa-kurzfristige-erfolgsrechnung-muster.pdf' },
  { gruppe: 'BWA', art: 'PDF', titel: 'Wertenachweis Vorjahresvergleich', datei: 'bwa-wertenachweis-vorjahresvergleich-muster.pdf' },
];

export const MUSTER_GRUPPEN = MUSTER.map((m) => m.gruppe).filter((g, i, alle) => alle.indexOf(g) === i);
