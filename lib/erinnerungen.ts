// Termin-Erinnerungen: 14 · 10 · 7 Tage vor dem Vor-Ort-Termin (`wb_sessions.termin_am`).
// Reine Datumslogik, bewusst ohne Abhängigkeiten (wie lib/video.ts) — damit
// `scripts/check-erinnerungen.mjs` sie ohne DB und ohne Next.js prüfen kann. Der
// eigentliche Lauf (DB lesen, Mail senden) steht in lib/erinnerungen-lauf.ts.

export const STUFEN = [14, 10, 7] as const;
export type Stufe = (typeof STUFEN)[number];

// Heutiges Kalenderdatum in Berlin, unabhängig von der Serverzeitzone (Vercel läuft in UTC).
export function heuteBerlin(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(new Date()); // YYYY-MM-DD
}

// Tage zwischen heute (Berlin) und `terminAm` — als reine Kalendertage, ohne Uhrzeit,
// damit eine Zeitumstellung nie zu einer Verschiebung um einen Tag führt.
export function tageBisTermin(terminAm: string, heute: string = heuteBerlin()): number {
  const [jt, mt, tt] = terminAm.split('-').map(Number);
  const [jh, mh, th] = heute.split('-').map(Number);
  const termin = Date.UTC(jt, mt - 1, tt);
  const heuteUtc = Date.UTC(jh, mh - 1, th);
  return Math.round((termin - heuteUtc) / 86_400_000);
}

export type ErinnerungsStand = {
  erinnerung_14_gesendet_at: string | null;
  erinnerung_10_gesendet_at: string | null;
  erinnerung_7_gesendet_at: string | null;
};

// Genau eine fällige, noch nicht gesendete Stufe je Aufruf — nie mehrere auf einmal, sonst
// bekäme ein spät eingetragener Termin drei Mails am selben Tag. Geprüft wird von der
// dringendsten Stufe (7 Tage) her: Ein verpasster Tag oder ein sehr spät eingetragener
// Termin soll die zur Wirklichkeit passende Stufe auslösen (7 statt fälschlich noch 14),
// nicht die älteste offene. Eine übersprungene, nie fällig gewordene Zwischenstufe bleibt
// dauerhaft ungesendet — das ist gewollt, ihr Inhalt wäre ohnehin überholt.
export function faelligeStufe(tage: number, stand: ErinnerungsStand): Stufe | null {
  if (tage < 0) return null;
  for (const stufe of [...STUFEN].reverse()) {
    const gesendet = stand[`erinnerung_${stufe}_gesendet_at` as const];
    if (!gesendet && tage <= stufe) return stufe;
  }
  return null;
}

// Was einer Sitzung noch fehlt — steuert, ob überhaupt eine Erinnerung geht und ob sie
// generisch ist (beides fehlt) oder gezielt auf die eine fehlende Sache zeigt. `null` heißt:
// nichts fehlt mehr, keine weitere Erinnerung nötig, unabhängig davon, welche Stufe fällig wäre.
export type FehlendeUnterlagen = 'beide' | 'workbook' | 'finanzdaten' | null;
export function fehlendeUnterlagen(workbookFehlt: boolean, finanzdatenFehlen: boolean): FehlendeUnterlagen {
  if (workbookFehlt && finanzdatenFehlen) return 'beide';
  if (workbookFehlt) return 'workbook';
  if (finanzdatenFehlen) return 'finanzdaten';
  return null;
}
