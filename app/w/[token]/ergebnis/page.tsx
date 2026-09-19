import { redirect } from 'next/navigation';
import { sitzungLaden } from '@/lib/sitzung';
import { texteLaden } from '@/lib/texte';
import { db } from '@/lib/db';
import { Ergebnis } from '@/components/Ergebnis';

export default async function ErgebnisSeite({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const s = await sitzungLaden(token);
  if (!s) {
    return (
      <main className="max-w-[620px] mx-auto px-8 py-24 text-center">
        <p className="fine">Dieser Link ist ungültig. Schreib uns an <a className="underline" href="mailto:office@joerg-roos.com">office@joerg-roos.com</a>.</p>
      </main>
    );
  }
  if (s.status === 'eingeladen') redirect(`/w/${token}`);
  // Nur mit fertiger PDF weiter zur Fertig-Seite — sonst bleibt der Kunde hier, wo der Retry-Knopf sitzt.
  if (s.status === 'abgeschlossen' && s.pdf_path) redirect(`/w/${token}/fertig`);
  if (s.status === 'laufend') await db.from('wb_sessions').update({ status: 'ergebnis' }).eq('id', s.id);
  const texte = await texteLaden();
  return <Ergebnis token={token} snapshot={s.fragen_snapshot} antworten={s.antworten} aha={s.aha} vorname={s.vorname} texte={texte} />;
}
