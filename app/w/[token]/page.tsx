import { redirect } from 'next/navigation';
import { sitzungLaden } from '@/lib/sitzung';
import { texteLaden } from '@/lib/texte';
import { Interview } from '@/components/Interview';
import { EinladungStart } from '@/components/EinladungStart';

export default async function InterviewSeite({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ frage?: string }> }) {
  const { token } = await params;
  const { frage } = await searchParams;
  const s = await sitzungLaden(token);
  if (!s) {
    return (
      <main className="max-w-[620px] mx-auto px-8 py-24 text-center">
        <p className="fine">Dieser Link ist ungültig. Schreib uns an <a className="underline" href="mailto:office@joerg-roos.com">office@joerg-roos.com</a>.</p>
      </main>
    );
  }
  if (s.status === 'eingeladen') {
    const texte = await texteLaden();
    const kontakt = { vorname: s.vorname, nachname: s.nachname, firma: s.firma, telefon: s.telefon, email: s.email };
    return <EinladungStart token={token} kontakt={kontakt} texte={texte} />;
  }
  // Nur mit fertiger PDF auf die Fertig-Seite — eine gestrandete "abgeschlossen"-Zeile ohne pdf_path
  // (Prozess mitten im Rendern beendet) landet stattdessen auf dem Ergebnis, wo der Retry-Knopf sitzt.
  if (s.status === 'abgeschlossen' && s.pdf_path) redirect(`/w/${token}/fertig`);
  if (s.status === 'abgeschlossen') redirect(`/w/${token}/ergebnis`);
  const start = frage !== undefined && Number.isInteger(Number(frage)) && Number(frage) >= 0 ? Number(frage) : s.aktuelle_frage;
  return <Interview token={token} snapshot={s.fragen_snapshot} antworten={s.antworten} start={start} vorname={s.vorname} zurueckZumErgebnis={frage !== undefined} />;
}
