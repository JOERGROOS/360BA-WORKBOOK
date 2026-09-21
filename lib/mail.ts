import { Resend } from 'resend';
import { texteLaden, fuelle } from './texte';
import { linkFuer } from './sitzung';
import { html } from './mail-html';
import type { Sitzung } from './db';
import type { Stufe, FehlendeUnterlagen } from './erinnerungen';

const VON = 'JOERG ROOS <noreply@joerg-roos.com>';
const ANTWORT_AN = 'office@joerg-roos.com';
export const INTERN = 'controlling@joerg-roos.com';

export async function sendeMail(m: { an: string[]; betreff: string; text: string; anhang?: { dateiname: string; inhalt: Buffer } }): Promise<void> {
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY fehlt');
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: VON, to: m.an, replyTo: ANTWORT_AN, subject: m.betreff, text: m.text, html: html(m.text),
    attachments: m.anhang ? [{ filename: m.anhang.dateiname, content: m.anhang.inhalt }] : undefined,
  });
  if (error) throw new Error(`Resend: ${JSON.stringify(error)}`);
}

export async function linkMailSenden(s: Sitzung): Promise<void> {
  const t = await texteLaden();
  const werte = { vorname: s.vorname, link: linkFuer(s) };
  await sendeMail({ an: [s.email], betreff: fuelle(t.mail_link_betreff, werte), text: fuelle(t.mail_link_text, werte) });
}

// Interne Mail nach dem Finanzdaten-Upload — keine Anhänge, nur ein Hinweis für das Team.
export async function finanzdatenMailSenden(s: Sitzung, namen: string[]): Promise<void> {
  const mehrzahl = namen.length === 1 ? '' : 'en';
  await sendeMail({
    an: [INTERN],
    betreff: `Neue Finanzdaten von ${s.firma}: ${namen.length} Datei${mehrzahl}`,
    text: `${s.vorname} ${s.nachname} (${s.firma}) hat ${namen.length} Datei${mehrzahl} hochgeladen:\n\n${namen.join('\n')}`,
  });
}

// Termin-Erinnerung 14 · 10 · 7 Tage vorher — Text kommt komplett aus dem Admin (Bereich
// „E-Mails“). Fehlt nur EINE Sache (Workbook oder Finanzdaten), geht die zielgerichtete
// „_teilweise“-Fassung raus, die per {fehlt} ausschließlich die fehlende Sache benennt —
// nie eine generische Erinnerung, wenn eigentlich nur noch eine Kleinigkeit fehlt.
export async function erinnerungMailSenden(s: Sitzung, stufe: Stufe, fehlend: Exclude<FehlendeUnterlagen, null>): Promise<void> {
  const t = await texteLaden();
  const fehlt = fehlend === 'workbook' ? 'dein Workbook' : fehlend === 'finanzdaten' ? 'deine Finanzdaten' : '';
  const suffix = fehlend === 'beide' ? '' : '_teilweise';
  const werte = { vorname: s.vorname, firma: s.firma, link: linkFuer(s), tage: String(stufe), fehlt };
  await sendeMail({
    an: [s.email],
    betreff: fuelle(t[`mail_erinnerung_${stufe}${suffix}_betreff`] ?? '', werte),
    text: fuelle(t[`mail_erinnerung_${stufe}${suffix}_text`] ?? '', werte),
  });
}
