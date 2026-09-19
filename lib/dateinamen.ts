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

// Entfernt den Zeitstempel-Präfix, den `uploadAdresse` beim Speichern voranstellt
// (`<Date.now()>-<dateinameSicher(name)>`) — für die Anzeige/DB brauchen wir nur den
// eigentlichen Namen. Abhängigkeitsfrei, damit der Abholer sie direkt importieren kann.
export function dateinameAusStorageName(name: string): string {
  return name.replace(/^\d+-/, '');
}

// Ein Name, der nur aus Punkten/Unterstrichen besteht (oder leer ist) — insbesondere "." und
// "..", die in `path.join` als "aktuelles"/"übergeordnetes Verzeichnis" gelesen werden und
// damit den Abholer aus dem Zielordner heraus schreiben lassen könnten (Pfad-Traversal).
function nurPunkteOderLeer(s: string): boolean {
  return /^[._]*$/.test(s);
}

// Führende Punkte (Versteck-/Traversal-Notation ".", "..", ".hidden") und abschließende
// Punkte/Leerzeichen abschneiden — beides sind auf macOS/Windows unerwünschte Datei-/
// Ordnernamen-Enden, keine normalen Zeichen mitten im Namen.
function ohneRandpunkte(s: string): string {
  return s.replace(/^\.+/, '').replace(/[.\s]+$/, '');
}

export function dateinameSicher(name: string): string {
  const bereinigt = ohneRandpunkte(name.trim().replace(ZEICHEN_ERLAUBT, '_')).slice(0, 150);
  return nurPunkteOderLeer(bereinigt) ? 'datei' : bereinigt;
}

// Ordnername für die Ablage beim Kunden (Firmenname), Regel aus den Global Constraints:
// nur A-Za-z0-9 äöüÄÖÜß._- erlaubt, Rest → `_`, max. 80 Zeichen, leer/nur Punkte →
// Kunde-<Sitzungs-ID kurz>.
export function ordnerName(firma: string, sitzungId: string): string {
  const bereinigt = ohneRandpunkte(firma.trim().replace(ZEICHEN_ERLAUBT, '_')).slice(0, 80);
  return nurPunkteOderLeer(bereinigt) ? `Kunde-${sitzungId.slice(0, 8)}` : bereinigt;
}

// Content-Disposition mit Umlauten (z. B. aus `ordnerName`): ASCII-Fallback fürs alte
// `filename`-Feld (manche Clients ignorieren `filename*`) plus die UTF-8-kodierte Fassung
// nach RFC 6266/5987, die moderne Browser für den echten Dateinamen nehmen.
export function contentDispositionAttachment(name: string): string {
  const ascii = name.replace(/[^\x20-\x7E]/g, '_');
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}
