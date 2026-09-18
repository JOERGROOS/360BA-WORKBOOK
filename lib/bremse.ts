// ponytail: Zähler im Modulspeicher. Vercel-Funktionen starten kalt und teilen ihn nicht —
// als Missbrauchs-Bremse für ein Vorbereitungs-Tool reicht das. Upstash Redis, wenn es je knapp wird.
const zaehler = new Map<string, { n: number; bis: number }>();
export function bremse(schluessel: string, max: number, fensterSekunden: number): boolean {
  const jetzt = Date.now();
  const e = zaehler.get(schluessel);
  if (!e || e.bis < jetzt) { zaehler.set(schluessel, { n: 1, bis: jetzt + fensterSekunden * 1000 }); return true; }
  e.n += 1;
  return e.n <= max;
}
export function aufruferIp(req: Request): string {
  return (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unbekannt';
}
