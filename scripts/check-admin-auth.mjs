process.env.ADMIN_PASSWORD = 'test-passwort';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
const { cookieWert, adminGeprueft } = await import('../lib/admin-auth.ts');

function reqMitCookie(cookie) {
  return new Request('http://localhost/x', { headers: cookie ? { cookie } : {} });
}
function sig(ablauf) {
  return createHmac('sha256', process.env.ADMIN_PASSWORD).update(ablauf).digest('base64url');
}

const wert = cookieWert();
assert.equal(adminGeprueft(reqMitCookie(`wb_admin=${wert}`)), true, 'gültiges Cookie muss durchgehen');
assert.equal(adminGeprueft(reqMitCookie()), false, 'fehlendes Cookie muss scheitern');

const ablaufVergangenheit = String(Date.now() - 1000);
const abgelaufen = `${ablaufVergangenheit}.${sig(ablaufVergangenheit)}`; // korrekt signiert, aber Ablauf in der Vergangenheit
assert.equal(adminGeprueft(reqMitCookie(`wb_admin=${abgelaufen}`)), false, 'abgelaufenes Cookie muss scheitern');

const [ablauf, s] = wert.split('.');
const manipuliert = `${ablauf}.${s.slice(0, -1)}${s.at(-1) === 'a' ? 'b' : 'a'}`;
assert.equal(adminGeprueft(reqMitCookie(`wb_admin=${manipuliert}`)), false, 'manipulierte Signatur muss scheitern');

console.log('ok');
