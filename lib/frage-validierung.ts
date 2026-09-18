export const FRAGE_TYPEN = ['text', 'skala', 'tabelle'];

export function tabelleGueltig(o: unknown): boolean {
  const zeilen = (o as { zeilen?: unknown })?.zeilen;
  const spalten = (o as { spalten?: unknown })?.spalten;
  const liste = (l: unknown) => Array.isArray(l) && l.length > 0 && l.every((v) => typeof v === 'string' && v.trim());
  return liste(zeilen) && liste(spalten);
}
