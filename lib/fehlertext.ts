export class AufrufFehler extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

const SERVERFEHLER = 'Der Server hat mit einem Fehler geantwortet.';

// Wandelt einen Fehler aus `aufruf()` in einen kurzen, anzeigbaren Text um. Eine falsch
// konfigurierte Umgebungsvariable kann dazu führen, dass die API eine ganze HTML-Fehlerseite
// als Meldung zurückgibt (siehe lib/db.ts) — die darf nie roh im Admin-Bereich landen.
export function fehlertext(e: unknown): string {
  if (e instanceof AufrufFehler && e.status === 401) return 'Sitzung abgelaufen – bitte neu anmelden.';
  const m = e instanceof Error ? e.message : 'Das hat nicht geklappt.';
  if (m.trimStart().startsWith('<') || m.length > 500) return SERVERFEHLER;
  const bereinigt = m.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return bereinigt.length > 200 ? `${bereinigt.slice(0, 200)}…` : bereinigt;
}
