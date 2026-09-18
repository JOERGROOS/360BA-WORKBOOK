import { Resend } from 'resend';
import { texteLaden, fuelle } from './texte';
import { linkFuer } from './sitzung';
import { html } from './mail-html';
import type { Sitzung } from './db';

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
