import { createHmac, timingSafeEqual } from 'node:crypto';
import { bremse, aufruferIp } from './bremse.ts';

const COOKIE = 'wb_admin';
const DAUER_S = 12 * 3600;
function geheim() { const p = process.env.ADMIN_PASSWORD; if (!p) throw new Error('ADMIN_PASSWORD fehlt'); return p; }
function sig(ablauf: string) { return createHmac('sha256', geheim()).update(ablauf).digest('base64url'); }

export function gleichOhneZeitverrat(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function cookieWert(): string { const ablauf = String(Date.now() + DAUER_S * 1000); return `${ablauf}.${sig(ablauf)}`; }
export function cookieKopf(wert: string, loeschen = false): string {
  return `${COOKIE}=${loeschen ? '' : wert}; Path=/; HttpOnly; SameSite=Lax; ${process.env.NODE_ENV === 'production' ? 'Secure; ' : ''}Max-Age=${loeschen ? 0 : DAUER_S}`;
}
export function adminGeprueft(req: Request): boolean {
  const roh = (req.headers.get('cookie') ?? '').split(';').map((c) => c.trim()).find((c) => c.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  if (!roh) return false;
  const [ablauf, s] = roh.split('.');
  if (!ablauf || !s || Number(ablauf) < Date.now()) return false;
  return gleichOhneZeitverrat(s, sig(ablauf));
}
export function loginErlaubt(req: Request): boolean { return bremse(`admin:${aufruferIp(req)}`, 10, 3600); }
// Für den täglichen Erinnerungs-Lauf: entweder Admin-Cookie (Jörgs „Jetzt prüfen"-Knopf)
// oder das Cron-Geheimnis, das Vercel Cron automatisch als Bearer-Token mitschickt.
export function cronGeprueft(req: Request): boolean {
  const soll = process.env.CRON_SECRET;
  if (!soll) return false;
  const kopf = req.headers.get('authorization') ?? '';
  if (!kopf.startsWith('Bearer ')) return false;
  return gleichOhneZeitverrat(kopf.slice(7), soll);
}
