// Reine, abhängigkeitsfreie Funktionen rund um Dateinamen für den Finanzdaten-Upload.
// Bewusst ohne Imports: Der Abholer auf Jörgs Mac (Task 3) importiert diese Datei mit
// einfachem `node`, ohne Supabase-Client oder Next.js im Gepäck.

export const ERLAUBT: Record<string, string[]> = {
  '.pdf': ['application/pdf'],
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  '.xls': ['application/vnd.ms-excel'],
  '.csv': ['text/csv', 'application/vnd.ms-excel', 'text/plain'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.doc': ['application/msword'],
  '.txt': ['text/plain'],
  '.pptx': ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  '.ppt': ['application/vnd.ms-powerpoint'],
};

export const MAX_BYTES = 50 * 1024 * 1024;
export const MAX_DATEIEN = 30;

// Nur dieser Zeichensatz ist in Ordner- und Dateinamen erlaubt (Vorgabe aus den Constraints
// für den Ordnernamen, hier für beide verwendet). Leerzeichen bleiben, der Rest wird zu `_`.
const ZEICHEN_ERLAUBT = /[^A-Za-z0-9 äöüÄÖÜß._-]/g;

export function endung(dateiname: string): string {
  const i = dateiname.lastIndexOf('.');
  return i === -1 ? '' : dateiname.slice(i).toLowerCase();
}

export function typErlaubt(dateiname: string, contentType: string): boolean {
  const erlaubte = ERLAUBT[endung(dateiname)];
  return !!erlaubte && erlaubte.includes(contentType);
}

export function dateinameSicher(name: string): string {
  const bereinigt = name.trim().replace(ZEICHEN_ERLAUBT, '_').slice(0, 150);
  return bereinigt || 'datei';
}

// Ordnername für die Ablage beim Kunden (Firmenname), Regel aus den Global Constraints:
// nur A-Za-z0-9 äöüÄÖÜß._- erlaubt, Rest → `_`, max. 80 Zeichen, leer → Kunde-<Sitzungs-ID kurz>.
export function ordnerName(firma: string, sitzungId: string): string {
  const trimmed = firma.trim();
  if (!trimmed) return `Kunde-${sitzungId.slice(0, 8)}`;
  return trimmed.replace(ZEICHEN_ERLAUBT, '_').slice(0, 80);
}
