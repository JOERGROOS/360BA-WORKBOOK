import { Resend } from 'resend';
import { texteLaden, fuelle } from './texte';
import { linkFuer } from './sitzung';
import type { Sitzung } from './db';

const VON = 'JOERG ROOS <noreply@joerg-roos.com>';
const ANTWORT_AN = 'office@joerg-roos.com';
export const INTERN = 'controlling@joerg-roos.com';

function html(text: string): string {
  const abs = text.split(/\n\n+/).map((a) => `<p style="margin:0 0 16px;line-height:1.6">${a.replace(/\n/g, '<br>').replace(/(https?:\/\/\S+)/g, '<a href="$1" style="color:#ED7A02">$1</a>')}</p>`).join('');
  return `<div style="font-family:Montserrat,Arial,sans-serif;font-size:16px;color:#0F1B23;max-width:600px;margin:0 auto;padding:32px 24px">${abs}<p style="font-size:12px;color:#878D91;margin-top:32px">JOERG ROOS · Zum Stadtgraben 5 · 45721 Haltern am See · joerg-roos.com</p></div>`;
}

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
