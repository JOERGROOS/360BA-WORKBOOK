import { db, type Sitzung } from './db';
import { texteLaden, fuelle } from './texte';
import { pdfErzeugen, pdfDateiname } from './pdf/render';
import { sendeMail, INTERN } from './mail';
import { linkFuer } from './sitzung';

export async function signierteAdresse(pfad: string): Promise<string> {
  const { data, error } = await db.storage.from('workbooks').createSignedUrl(pfad, 3600);
  if (error || !data) throw error ?? new Error('Keine Adresse');
  return data.signedUrl;
}

// Idempotent: liegt die PDF schon, wird sie nicht neu erzeugt und nicht erneut verschickt.
// RESEND_API_KEY kann fehlen — dann ist das Workbook trotzdem fertig (PDF liegt, Status steht),
// nur der Mailversand schlägt fehl. Das darf den Abschluss nicht rückgängig machen.
export async function abschliessen(s: Sitzung, neuErzeugen = false): Promise<{ pfad: string; mailFehler?: boolean }> {
  if (s.pdf_path && s.status === 'abgeschlossen' && !neuErzeugen) return { pfad: s.pdf_path };
  const jetzt = new Date().toISOString();
  if (!neuErzeugen) {
    // Selbstheilung: eine "abgeschlossen"-Zeile ohne PDF, die seit über zwei Minuten so steht, ist ein
    // gestrandeter Versuch (Prozess mitten im Rendern/Hochladen beendet, siehe Catch unten). Zurück auf
    // "ergebnis", damit der Retry unten die Beanspruchung wieder gewinnen kann statt für immer 409 zu liefern.
    if (s.status === 'abgeschlossen' && !s.pdf_path && Date.now() - new Date(s.updated_at).getTime() > 120_000) {
      await db.from('wb_sessions').update({ status: 'ergebnis', abgeschlossen_at: null }).eq('id', s.id).eq('status', 'abgeschlossen').is('pdf_path', null);
    }
    // Schutz gegen doppelten Abschluss (Doppelklick, Retry nach Timeout): den Status atomar beanspruchen,
    // BEVOR die PDF gerendert wird. Nur wer die Zeile wirklich von laufend/ergebnis auf abgeschlossen dreht,
    // rendert und verschickt Mails — der Verlierer bekommt hier nur den (ggf. noch leeren) Stand zurück.
    const { data: beansprucht, error: eBean } = await db.from('wb_sessions')
      .update({ status: 'abgeschlossen', abgeschlossen_at: jetzt, updated_at: jetzt })
      .eq('id', s.id).in('status', ['laufend', 'ergebnis']).select('id');
    if (eBean) throw eBean;
    if (!beansprucht || beansprucht.length === 0) {
      const { data: neu } = await db.from('wb_sessions').select('pdf_path').eq('id', s.id).maybeSingle();
      return { pfad: neu?.pdf_path ?? '' };
    }
  }
  let texte: Record<string, string>, pdf: Buffer, dateiname: string, pfad: string;
  try {
    // Test-Schalter, NUR außerhalb von Produktion wirksam: WB_TEST_RENDER_FEHLER=1 erzwingt hier einen
    // Fehler, um die Rücknahme der Beanspruchung unten im Catch reproduzierbar zu prüfen (dev/lokal).
    if (process.env.NODE_ENV !== 'production' && process.env.WB_TEST_RENDER_FEHLER === '1') {
      throw new Error('WB_TEST_RENDER_FEHLER: erzwungener Renderfehler für den Abschluss-Test');
    }
    texte = await texteLaden();
    pdf = await pdfErzeugen(s, texte);
    dateiname = pdfDateiname(s);
    pfad = `${s.id}/${dateiname}`;
    const { error: eUp } = await db.storage.from('workbooks').upload(pfad, pdf, { contentType: 'application/pdf', upsert: true });
    if (eUp) throw eUp;
    const { error: eDb } = await db.from('wb_sessions').update({ pdf_path: pfad, status: 'abgeschlossen', abgeschlossen_at: jetzt, updated_at: new Date().toISOString() }).eq('id', s.id);
    if (eDb) throw eDb;
  } catch (e) {
    if (!neuErzeugen) {
      // Beanspruchung zurücknehmen — aber nur, wenn wirklich noch keine PDF liegt, damit ein parallel
      // erfolgreicher Lauf hierdurch nie überschrieben wird. Fest auf "ergebnis" statt s.status: nach der
      // Selbstheilung oben (oder einem zweiten Fehlschlag auf einer schon gestrandeten Zeile) ist s.status
      // veraltet ("abgeschlossen"), das würde die Zeile sonst wieder festnageln.
      await db.from('wb_sessions').update({ status: 'ergebnis', abgeschlossen_at: null }).eq('id', s.id).eq('status', 'abgeschlossen').is('pdf_path', null);
    }
    throw e;
  }
  if (neuErzeugen) return { pfad };
  const werte = { vorname: s.vorname, nachname: s.nachname, firma: s.firma, email: s.email, telefon: s.telefon, link: linkFuer(s) };
  try {
    await sendeMail({ an: [s.email], betreff: fuelle(texte.mail_fertig_betreff, werte), text: fuelle(texte.mail_fertig_text, werte), anhang: { dateiname, inhalt: pdf } });
    if (!s.test) await sendeMail({ an: [INTERN], betreff: `Workbook 360° BA · ${s.vorname} ${s.nachname} · ${s.firma}`, text: fuelle(texte.mail_intern_text, werte), anhang: { dateiname, inhalt: pdf } });
  } catch (e) {
    console.error('[abschluss] Mail', e);
    return { pfad, mailFehler: true };
  }
  return { pfad };
}
